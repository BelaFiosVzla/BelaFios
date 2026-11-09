#!/usr/bin/env python3
"""Arma la medición en cada página del sitio.

Uso:  python3 tools/tracking_build.py        (desde la raíz del repo)

Qué hace en cada .html:
  1. Convierte los onclick inline de whatsapp_click en data-section (se conserva el dato).
  2. Quita los listeners globales antiguos de whatsapp_click (home, colorimetría, distribución).
  3. Inserta js/belafios-tracking.js, idéntico en todas, entre los marcadores bf-tracking.
Así cada página queda con un solo mecanismo: el listener delegado del módulo."""
import pathlib
import re
import sys

START = '<!-- bf-tracking:start -->'
END = '<!-- bf-tracking:end -->'

_INLINE_RE = re.compile(
    r"""onclick="(?:if\(window\.gtag\)\{?)?gtag\('event','whatsapp_click',\{'section':'([^']*)'\}\)\}?;?(?:return true;)?\"""")
_LEGACY_RE = re.compile(
    r"""document\.addEventListener\('click',function\(e\)\{var wa=e\.target\.closest\('a\[href\*="wa\.me"\]'\);"""
    r"""if\(wa\)\{gtag\('event','whatsapp_click',\{.*?\}\);\}\}\);""")
_BLOCK_RE = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


def inline_onclick_to_data(html):
    return _INLINE_RE.sub(lambda m: f'data-section="{m.group(1)}"', html)


def remove_legacy_listener(html):
    return _LEGACY_RE.sub('', html)


def inject_snippet(html, js):
    if '<!--' in js or '</script' in js.lower():
        raise ValueError('el JS no puede contener <!-- ni </script>')
    if 'http-equiv="refresh"' in html:
        return html
    html = _BLOCK_RE.sub('', html)
    block = f'{START}<script>{js}</script>{END}\n'
    head, sep, tail = html.rpartition('</body>')
    return head + block + sep + tail if sep else html


def transform_page(html, js):
    return inject_snippet(remove_legacy_listener(inline_onclick_to_data(html)), js)


def main(root='.'):
    root = pathlib.Path(root)
    js = (root / 'js' / 'belafios-tracking.js').read_text(encoding='utf-8').strip()
    changed = []
    for page in sorted(root.rglob('*.html')):
        before = page.read_text(encoding='utf-8')
        after = transform_page(before, js)
        if after != before:
            page.write_text(after, encoding='utf-8')
            changed.append(str(page.relative_to(root)))
    print(f'{len(changed)} páginas actualizadas')
    return changed


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
