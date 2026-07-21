// ============================================================
// analitica-track.js — Medición propia de la web (first-party).
// Registra en Supabase: visitas de página, clics en teléfono y
// clics en WhatsApp. El panel de control lo lee y lo pinta.
// Privado y ligero: sin cookies de rastreo, sin datos personales.
// Requiere la tabla public.web_events (ver supabase/…-v8-analitica.sql).
// ============================================================
(function () {
  "use strict";
  var cfg = window.DECOGAS_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

  // No medir los paneles internos (por si algún día cargan esto)
  var p = location.pathname;
  if (/\/(admin|clientes)\.html?$/.test(p)) return;

  var ENDPOINT = cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/web_events";

  // ---- Sesión anónima (una "visita" = mientras la pestaña siga abierta) ----
  var session;
  try {
    session = sessionStorage.getItem("decogas_sid");
    if (!session) {
      session = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("decogas_sid", session);
    }
  } catch (e) {
    session = Math.random().toString(36).slice(2);
  }

  var device = (window.matchMedia && window.matchMedia("(max-width: 760px)").matches) ? "movil" : "escritorio";

  function sourceFrom(ref) {
    if (!ref) return "directo";
    try {
      var h = new URL(ref).hostname.replace(/^www\./, "");
      if (h === location.hostname) return "interno";
      if (/(^|\.)google\./.test(h)) return "google";
      if (/(^|\.)bing\./.test(h)) return "bing";
      if (/duckduckgo\./.test(h)) return "duckduckgo";
      if (/(facebook|fb)\./.test(h)) return "facebook";
      if (/instagram\./.test(h)) return "instagram";
      if (/(t\.co|twitter|x)\./.test(h)) return "twitter";
      return h;
    } catch (e) { return "directo"; }
  }

  function send(type, extra) {
    var body = { type: type, path: p.slice(0, 200), session: session, device: device };
    if (extra) { for (var k in extra) if (extra[k] != null) body[k] = String(extra[k]).slice(0, 300); }
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + cfg.supabaseAnonKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  // ---- Visita de página ----
  var ref = document.referrer || "";
  send("pageview", { referrer: ref, source: sourceFrom(ref) });

  // ---- Clics en teléfono / WhatsApp (delegación, captura) ----
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) send("call");
    else if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href)) send("whatsapp");
  }, true);
})();
