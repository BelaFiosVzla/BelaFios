"""Pruebas de los bloques de captación de la Parte A."""
import unittest

import lead_blocks as lb


class LeadBlocksTest(unittest.TestCase):
    def test_wa_url_codifica_el_texto_con_tildes(self):
        self.assertEqual(lb.wa_url('Hola, mi diagnóstico'),
                         'https://wa.me/584146888360?text=Hola%2C%20mi%20diagn%C3%B3stico')

    def test_wa_button_lleva_intencion_y_ubicacion_explicitas(self):
        html = lb.wa_button('Agendar', 'Hola', 'diagnostico', 'cuerpo')
        self.assertIn('data-intencion="diagnostico"', html)
        self.assertIn('data-ubicacion="cuerpo"', html)
        self.assertNotIn('onclick', html)

    def test_add_css_es_idempotente(self):
        once = lb.add_css('<head></head>')
        self.assertEqual(lb.add_css(once), once)

    def test_insert_before_exige_un_ancla_unica(self):
        with self.assertRaises(AssertionError):
            lb.insert_before('<h2>x</h2><h2>x</h2>', '<h2>x</h2>', 'y')


if __name__ == '__main__':
    unittest.main()
