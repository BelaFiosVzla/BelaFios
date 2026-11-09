"""Pruebas del armado de páginas para la medición (B1/B2).
Ejecutar: python3 -m unittest discover -s tools -p 'test_*.py'"""
import unittest

import tracking_build as tb


class InlineOnclickTest(unittest.TestCase):
    def test_convierte_las_tres_variantes_de_onclick_en_data_section(self):
        variants = [
            "<a href=\"https://wa.me/1\" onclick=\"if(window.gtag){gtag('event','whatsapp_click',{'section':'hero'})};return true;\">x</a>",
            "<a href=\"https://wa.me/1\" onclick=\"if(window.gtag)gtag('event','whatsapp_click',{'section':'hero'});\">x</a>",
            "<a href=\"https://wa.me/1\" onclick=\"gtag('event','whatsapp_click',{'section':'hero'});return true;\">x</a>",
        ]
        for html in variants:
            self.assertEqual(tb.inline_onclick_to_data(html), '<a href="https://wa.me/1" data-section="hero">x</a>')

    def test_no_toca_otros_onclick(self):
        html = '<button onclick="toggleFaq(this)">x</button>'
        self.assertEqual(tb.inline_onclick_to_data(html), html)


class LegacyListenerTest(unittest.TestCase):
    def test_quita_el_listener_global_antiguo_y_conserva_la_configuracion(self):
        html = ("<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());"
                "gtag('config','G-ZNWHE8ZGH5');document.addEventListener('click',function(e){var wa=e.target.closest('a[href*=\"wa.me\"]');"
                "if(wa){gtag('event','whatsapp_click',{event_category:'contacto',event_label:'colorimetria_espera'});}});</script>")
        out = tb.remove_legacy_listener(html)
        self.assertNotIn('whatsapp_click', out)
        self.assertIn("gtag('config','G-ZNWHE8ZGH5');</script>", out)

    def test_quita_la_variante_con_texto_del_enlace(self):
        html = ("gtag('config','G-ZNWHE8ZGH5');document.addEventListener('click',function(e){var wa=e.target.closest('a[href*=\"wa.me\"]');"
                "if(wa){gtag('event','whatsapp_click',{event_category: 'contacto',event_label: wa.textContent.trim().substring(0,40)});}});\nfunction toggleFaq(el){")
        self.assertEqual(tb.remove_legacy_listener(html), "gtag('config','G-ZNWHE8ZGH5');\nfunction toggleFaq(el){")


class InjectSnippetTest(unittest.TestCase):
    def test_inserta_el_bloque_antes_de_body(self):
        out = tb.inject_snippet('<body><p>x</p></body>', 'JS();')
        self.assertEqual(out, '<body><p>x</p>' + tb.START + '<script>JS();</script>' + tb.END + '\n</body>')

    def test_es_idempotente_y_reemplaza_la_version_anterior(self):
        once = tb.inject_snippet('<body></body>', 'v1();')
        twice = tb.inject_snippet(once, 'v2();')
        self.assertEqual(twice.count(tb.START), 1)
        self.assertIn('v2();', twice)
        self.assertNotIn('v1();', twice)

    def test_rechaza_codigo_que_romperia_los_marcadores_o_el_script(self):
        for bad in ['/* <!-- x --> */', 'var s="</script>";']:
            with self.assertRaises(ValueError):
                tb.inject_snippet('<body></body>', bad)

    def test_no_toca_paginas_de_redireccion(self):
        html = '<meta http-equiv="refresh" content="0;url=/"><body></body>'
        self.assertEqual(tb.inject_snippet(html, 'JS();'), html)


class TransformPageTest(unittest.TestCase):
    def test_una_pagina_queda_con_un_solo_mecanismo_de_medicion(self):
        html = ("<head><script>gtag('config','G-ZNWHE8ZGH5');document.addEventListener('click',function(e){var wa=e.target.closest('a[href*=\"wa.me\"]');"
                "if(wa){gtag('event','whatsapp_click',{event_category:'contacto',event_label:'x'});}});</script></head><body>"
                "<a href=\"https://wa.me/1\" onclick=\"if(window.gtag){gtag('event','whatsapp_click',{'section':'s'})};return true;\">x</a></body>")
        out = tb.transform_page(html, 'JS();')
        self.assertEqual(out.count('whatsapp_click'), 0)
        self.assertIn('data-section="s"', out)
        self.assertIn(tb.START, out)


if __name__ == '__main__':
    unittest.main()
