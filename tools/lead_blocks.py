"""Bloques de captación (Parte A) que se insertan en los artículos del blog.
Un bloque = un H2 + párrafos + CTAs, con estilos .lead-box compartidos."""
import re
import urllib.parse

WA_NUMBER = '584146888360'
CSS_MARK = '/* bf-lead-box */'
CSS = (CSS_MARK +
       '.lead-box{border:1px solid rgba(200,169,110,.6);background:#FBF6EA;padding:1.4rem 1.3rem;margin:2rem 0}'
       '.lead-box h2{margin-top:0}'
       '.lead-box p{margin:0 0 1rem}'
       '.lead-box .lead-ctas{display:flex;flex-direction:column;gap:.75rem;align-items:flex-start;margin:0 0 1.2rem}'
       '.lead-box .lead-link{color:var(--leaf);font-weight:500;text-decoration:underline;text-underline-offset:3px}'
       '.lead-box .lead-split{border-top:.5px solid rgba(200,169,110,.6);padding-top:1rem;margin-top:.2rem}')
WA_ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;fill:#fff;flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>')


def wa_url(text):
    return f'https://wa.me/{WA_NUMBER}?text=' + urllib.parse.quote(text, safe='')


def wa_button(label, text, intencion, ubicacion):
    return (f'<a href="{wa_url(text)}" target="_blank" rel="noopener" class="wa-btn" '
            f'data-intencion="{intencion}" data-ubicacion="{ubicacion}">{WA_ICON}{label}</a>')


def link(label, href, cls='lead-link'):
    return f'<a href="{href}" class="{cls}">{label}</a>'


def block(h2, inner):
    return f'<div class="lead-box">\n        <h2>{h2}</h2>\n        {inner}\n      </div>\n\n      '


def add_css(html):
    if CSS_MARK in html:
        return html
    return html.replace('</head>', f'<style>{CSS}</style>\n</head>', 1)


def insert_before(html, anchor, snippet):
    assert html.count(anchor) == 1, (html.count(anchor), anchor[:60])
    return html.replace(anchor, snippet + anchor)


def insert_after_first_paragraph(html):
    m = re.search(r'<div class="blog-full-body">\s*<p>.*?</p>\s*', html, re.S)
    assert m, 'primer párrafo no encontrado'
    return m.end()
