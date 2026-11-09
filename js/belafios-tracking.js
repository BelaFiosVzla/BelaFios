/* BelaFios · medición GA4 (G-ZNWHE8ZGH5) con gtag directo.
 * Fuente única: este archivo. tools/tracking_build.py lo copia dentro de cada página
 * entre los marcadores bf-tracking (inicio y fin).
 * Eventos:
 *   whatsapp_click  -> intencion (diagnostico|tienda|distribucion|dotacion|bienestar_intimo), cta_ubicacion, section
 *   generate_lead   -> lead_source = guia_marabina, page_path (solo con respuesta OK del webhook)
 * Nunca se envían datos personales: safeParams filtra claves y valores. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BelaFiosTracking = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var INTENCIONES = ['diagnostico', 'tienda', 'distribucion', 'dotacion', 'bienestar_intimo'];
  var ALLOWED_PARAMS = ['intencion', 'cta_ubicacion', 'section', 'lead_source', 'page_path'];
  var WHATSAPP_RE = /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i;
  var EMAIL_RE = /@/;
  var PHONE_RE = /\d[\d\s().+-]{6,}\d/;

  function normalize(value) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function intencionFromPath(pathname) {
    var path = String(pathname || '');
    if (/^\/tienda\//.test(path)) return 'tienda';
    if (/^\/distribucion(\/|-)/.test(path)) return 'distribucion';
    if (/^\/dotacion-industrial\//.test(path)) return 'dotacion';
    if (/^\/bienestar-intimo\//.test(path)) return 'bienestar_intimo';
    return 'diagnostico';
  }

  function resolveIntencion(explicit, pathname) {
    var value = normalize(explicit);
    return INTENCIONES.indexOf(value) !== -1 ? value : intencionFromPath(pathname);
  }

  function resolveUbicacion(el) {
    var explicit = el && el.dataset ? normalize(el.dataset.ubicacion) : '';
    if (explicit) return explicit;
    if (!el || typeof el.closest !== 'function') return 'cuerpo';
    if (el.closest('header, nav')) return 'header';
    if (el.closest('footer')) return 'footer';
    if (el.closest('.wa-float, .wa-fab, .float-wa, .sticky-cta')) return 'flotante';
    return 'cuerpo';
  }

  function isWhatsappLink(href) {
    return WHATSAPP_RE.test(String(href || ''));
  }

  function looksPersonal(value) {
    var text = String(value);
    return EMAIL_RE.test(text) || PHONE_RE.test(text) || text.indexOf('?') !== -1;
  }

  function safeParams(params) {
    var clean = {};
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (ALLOWED_PARAMS.indexOf(key) === -1) return;
      if (value == null || value === '' || looksPersonal(value)) return;
      clean[key] = String(value);
    });
    return clean;
  }

  function send(gtag, eventName, params) {
    if (typeof gtag !== 'function') return false;
    gtag('event', eventName, safeParams(params));
    return true;
  }

  function whatsappParams(el, pathname) {
    var data = (el && el.dataset) || {};
    var params = {
      intencion: resolveIntencion(data.intencion, pathname),
      cta_ubicacion: resolveUbicacion(el),
    };
    if (data.section) params.section = data.section;
    return params;
  }

  function trackWhatsapp(gtag, params, pathname) {
    var p = params || {};
    return send(gtag, 'whatsapp_click', {
      intencion: resolveIntencion(p.intencion, pathname),
      cta_ubicacion: p.cta_ubicacion || 'cuerpo',
      section: p.section,
    });
  }

  function hasLegacyInlineTracking(el) {
    var inline = el && typeof el.getAttribute === 'function' ? el.getAttribute('onclick') : null;
    return Boolean(inline && inline.indexOf('whatsapp_click') !== -1);
  }

  function handleClick(gtag, el, pathname) {
    if (!el || !isWhatsappLink(el.getAttribute('href'))) return false;
    if (hasLegacyInlineTracking(el)) return false;
    return send(gtag, 'whatsapp_click', whatsappParams(el, pathname));
  }

  function createLeadTracker(gtag, pathname) {
    var sent = false;
    return function onWebhookResponse(response) {
      if (sent || !response || response.ok !== true) return false;
      sent = send(gtag, 'generate_lead', { lead_source: 'guia_marabina', page_path: pathname });
      return sent;
    };
  }

  function init(win, doc) {
    if (!win || !doc || win.__bfTrackingReady) return;
    win.__bfTrackingReady = true;
    doc.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      handleClick(win.gtag, target, win.location.pathname);
    }, true);
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') init(window, document);

  return {
    ALLOWED_PARAMS: ALLOWED_PARAMS,
    resolveIntencion: resolveIntencion,
    resolveUbicacion: resolveUbicacion,
    isWhatsappLink: isWhatsappLink,
    safeParams: safeParams,
    whatsappParams: whatsappParams,
    trackWhatsapp: trackWhatsapp,
    handleClick: handleClick,
    createLeadTracker: createLeadTracker,
    init: init,
  };
});
