'use strict';
// Pruebas de la medición de BelaFios (GA4 G-ZNWHE8ZGH5).
// Se ejecutan con: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/belafios-tracking.js');

// ---------- utilidades de prueba ----------
function fakeEl({ href = 'https://wa.me/584146888360', data = {}, ancestors = [], onclick = null } = {}) {
  // ancestors: lista de selectores que "contienen" al elemento (header, footer, .wa-float...)
  return {
    href,
    dataset: data,
    getAttribute(name) {
      if (name === 'href') return href;
      if (name === 'onclick') return onclick;
      const k = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return name.startsWith('data-') && k in data ? data[k] : null;
    },
    closest(sel) {
      return sel.split(',').map((s) => s.trim()).some((s) => ancestors.includes(s)) ? {} : null;
    },
  };
}
function gtagSpy() {
  const calls = [];
  const fn = (...args) => calls.push(args);
  fn.calls = calls;
  return fn;
}

// ---------- B1. resolveIntencion ----------
test('resolveIntencion: el atributo explícito manda sobre la ruta', () => {
  assert.equal(T.resolveIntencion('distribucion', '/blog/keratina-cabello-venezuela.html'), 'distribucion');
  assert.equal(T.resolveIntencion('tienda', '/servicios/botox-capilar-maracaibo.html'), 'tienda');
  assert.equal(T.resolveIntencion('diagnostico', '/tienda/kit-post-quimica-cacao.html'), 'diagnostico');
});

test('resolveIntencion: el atributo se normaliza (mayúsculas, espacios, tilde)', () => {
  assert.equal(T.resolveIntencion('  Diagnóstico ', '/'), 'diagnostico');
  assert.equal(T.resolveIntencion('TIENDA', '/'), 'tienda');
});

test('resolveIntencion: un atributo con valor desconocido se ignora y se infiere de la ruta', () => {
  assert.equal(T.resolveIntencion('compras', '/tienda/'), 'tienda');
  assert.equal(T.resolveIntencion('', '/distribucion/natural-pure-linea-salon.html'), 'distribucion');
});

test('resolveIntencion: /tienda/ -> tienda', () => {
  assert.equal(T.resolveIntencion(null, '/tienda/'), 'tienda');
  assert.equal(T.resolveIntencion(null, '/tienda/kit-argan-boom-hidratacion.html'), 'tienda');
});

test('resolveIntencion: /distribucion... -> distribucion (carpeta y página de salones)', () => {
  assert.equal(T.resolveIntencion(null, '/distribucion/only-one-linea-salon.html'), 'distribucion');
  assert.equal(T.resolveIntencion(null, '/distribucion-salones-venezuela.html'), 'distribucion');
});

test('resolveIntencion: /dotacion-industrial/ -> dotacion y /bienestar-intimo/ -> bienestar_intimo', () => {
  assert.equal(T.resolveIntencion(null, '/dotacion-industrial/'), 'dotacion');
  assert.equal(T.resolveIntencion(null, '/dotacion-industrial/index.html'), 'dotacion');
  assert.equal(T.resolveIntencion(null, '/bienestar-intimo/'), 'bienestar_intimo');
  assert.equal(T.resolveIntencion('bienestar_intimo', '/'), 'bienestar_intimo');
  assert.equal(T.resolveIntencion('dotacion', '/'), 'dotacion');
});

test('resolveIntencion: cualquier otra ruta -> diagnostico (valor por defecto)', () => {
  for (const p of ['/', '/index.html', '/blog/keratina-cabello-venezuela.html', '/servicios/', '/colorimetria.html', '', undefined]) {
    assert.equal(T.resolveIntencion(null, p), 'diagnostico', String(p));
  }
});

test('resolveIntencion: no confunde rutas que solo contienen la palabra', () => {
  assert.equal(T.resolveIntencion(null, '/blog/tienda-de-mascarillas.html'), 'diagnostico');
  assert.equal(T.resolveIntencion(null, '/blog/distribuidor-exclusivo-amazonica-beleza-venezuela.html'), 'diagnostico');
});

// ---------- B1. resolveUbicacion ----------
test('resolveUbicacion: usa data-ubicacion si existe', () => {
  assert.equal(T.resolveUbicacion(fakeEl({ data: { ubicacion: 'intro' } })), 'intro');
});

test('resolveUbicacion: infiere header, footer y flotante por contenedor', () => {
  assert.equal(T.resolveUbicacion(fakeEl({ ancestors: ['header'] })), 'header');
  assert.equal(T.resolveUbicacion(fakeEl({ ancestors: ['nav'] })), 'header');
  assert.equal(T.resolveUbicacion(fakeEl({ ancestors: ['footer'] })), 'footer');
  assert.equal(T.resolveUbicacion(fakeEl({ ancestors: ['.wa-float'] })), 'flotante');
});

test('resolveUbicacion: por defecto es cuerpo', () => {
  assert.equal(T.resolveUbicacion(fakeEl()), 'cuerpo');
});

// ---------- B1. isWhatsappLink ----------
test('isWhatsappLink reconoce wa.me y api.whatsapp.com y nada más', () => {
  assert.equal(T.isWhatsappLink('https://wa.me/584146888360?text=hola'), true);
  assert.equal(T.isWhatsappLink('https://api.whatsapp.com/send?phone=584146888360'), true);
  assert.equal(T.isWhatsappLink('/servicios/'), false);
  assert.equal(T.isWhatsappLink(''), false);
  assert.equal(T.isWhatsappLink(null), false);
});

// ---------- B1. whatsappParams ----------
test('whatsappParams arma intencion, cta_ubicacion y section desde el enlace', () => {
  const el = fakeEl({ data: { intencion: 'diagnostico', ubicacion: 'cierre', section: 'blog_top' } });
  assert.deepEqual(T.whatsappParams(el, '/blog/keratina-cabello-venezuela.html'), {
    intencion: 'diagnostico',
    cta_ubicacion: 'cierre',
    section: 'blog_top',
  });
});

test('whatsappParams omite section cuando el enlace no lo trae', () => {
  const p = T.whatsappParams(fakeEl(), '/tienda/');
  assert.deepEqual(p, { intencion: 'tienda', cta_ubicacion: 'cuerpo' });
});

// ---------- B1. trackWhatsapp ----------
test('trackWhatsapp envía whatsapp_click con intencion siempre presente', () => {
  const g = gtagSpy();
  T.trackWhatsapp(g, { cta_ubicacion: 'formulario' }, '/');
  assert.equal(g.calls.length, 1);
  assert.equal(g.calls[0][0], 'event');
  assert.equal(g.calls[0][1], 'whatsapp_click');
  assert.equal(g.calls[0][2].intencion, 'diagnostico');
  assert.equal(g.calls[0][2].cta_ubicacion, 'formulario');
});

test('trackWhatsapp no falla si gtag no está cargado (bloqueador de anuncios)', () => {
  assert.doesNotThrow(() => T.trackWhatsapp(undefined, { intencion: 'tienda' }, '/tienda/'));
});

// ---------- B1. clic delegado ----------
test('handleClick dispara un evento por clic en un enlace de WhatsApp', () => {
  const g = gtagSpy();
  const el = fakeEl({ data: { intencion: 'distribucion' } });
  T.handleClick(g, el, '/blog/keratina-cabello-venezuela.html');
  assert.equal(g.calls.length, 1);
  assert.equal(g.calls[0][2].intencion, 'distribucion');
});

test('handleClick ignora enlaces que no son de WhatsApp', () => {
  const g = gtagSpy();
  T.handleClick(g, fakeEl({ href: '/servicios/' }), '/');
  T.handleClick(g, null, '/');
  assert.equal(g.calls.length, 0);
});

test('handleClick no duplica si el enlace aún trae su gtag inline antiguo', () => {
  const g = gtagSpy();
  const el = fakeEl({ onclick: "if(window.gtag){gtag('event','whatsapp_click',{'section':'hero'})};return true;" });
  T.handleClick(g, el, '/');
  assert.equal(g.calls.length, 0);
});

// ---------- B2. generate_lead ----------
test('generate_lead se dispara con respuesta exitosa del webhook', () => {
  const g = gtagSpy();
  const onResponse = T.createLeadTracker(g, '/');
  onResponse({ ok: true, status: 200 });
  assert.equal(g.calls.length, 1);
  assert.deepEqual(g.calls[0], ['event', 'generate_lead', { lead_source: 'guia_marabina', page_path: '/' }]);
});

test('generate_lead NO se dispara si el webhook responde con error', () => {
  const g = gtagSpy();
  const onResponse = T.createLeadTracker(g, '/');
  onResponse({ ok: false, status: 404 });
  onResponse({ ok: false, status: 500 });
  onResponse(undefined);
  assert.equal(g.calls.length, 0);
});

test('generate_lead no se duplica aunque lleguen varias respuestas exitosas', () => {
  const g = gtagSpy();
  const onResponse = T.createLeadTracker(g, '/blog/');
  onResponse({ ok: true });
  onResponse({ ok: true });
  onResponse({ ok: true });
  assert.equal(g.calls.length, 1);
});

test('createLeadTracker devuelve si disparó o no, para que la UI pueda decidir', () => {
  const g = gtagSpy();
  const onResponse = T.createLeadTracker(g, '/');
  assert.equal(onResponse({ ok: false }), false);
  assert.equal(onResponse({ ok: true }), true);
  assert.equal(onResponse({ ok: true }), false);
});

// ---------- B3. sin datos personales ----------
test('safeParams elimina claves no permitidas (nombre, correo, teléfono, contacto)', () => {
  const p = T.safeParams({
    intencion: 'diagnostico',
    nombre: 'María',
    contacto: 'maria@correo.com',
    email: 'maria@correo.com',
    telefono: '+58 414 1234567',
    event_label: 'Hola, soy María',
  });
  assert.deepEqual(p, { intencion: 'diagnostico' });
});

test('safeParams descarta valores con forma de correo o teléfono aunque la clave sea permitida', () => {
  assert.deepEqual(T.safeParams({ section: 'maria@correo.com', cta_ubicacion: '+58 414 123 4567' }), {});
  assert.deepEqual(T.safeParams({ section: '04141234567' }), {});
  assert.deepEqual(T.safeParams({ page_path: '/blog/keratina-cabello-venezuela.html' }), { page_path: '/blog/keratina-cabello-venezuela.html' });
});

test('safeParams descarta la ruta si trae parámetros de consulta (podrían llevar datos)', () => {
  assert.deepEqual(T.safeParams({ page_path: '/?email=maria@correo.com' }), {});
});

test('ningún evento enviado contiene datos personales', () => {
  const g = gtagSpy();
  const el = fakeEl({
    href: 'https://wa.me/584146888360?text=Hola%20soy%20Maria%2C%20mi%20correo%20es%20maria%40correo.com',
    data: { intencion: 'diagnostico', section: 'hero' },
  });
  T.handleClick(g, el, '/');
  T.trackWhatsapp(g, { cta_ubicacion: 'formulario', nombre: 'María', telefono: '04141234567' }, '/');
  T.createLeadTracker(g, '/')({ ok: true });
  const pii = /@|\d{7,}|maria|maría|hola/i;
  for (const call of g.calls) {
    for (const [k, v] of Object.entries(call[2])) {
      assert.ok(!pii.test(String(v)), `dato personal en ${call[1]}.${k}: ${v}`);
      assert.ok(T.ALLOWED_PARAMS.includes(k), `parámetro no permitido ${call[1]}.${k}`);
    }
  }
  assert.equal(g.calls.length, 3);
});
