// ============================================================
// utils.js — Utilidades compartidas del front (ES5, sin build).
// Cuelgan de window.DecogasUtil para que el resto de IIFEs las
// tomen sin redefinirlas en cada archivo:
//   window.DecogasUtil.esc(s)          → escapa HTML (anti-XSS)
//   window.DecogasUtil.norm(s)         → normaliza texto (búsquedas)
//   window.DecogasUtil.isValidPrice(v) → precio válido (1..99999)
// Debe cargarse ANTES que los demás scripts propios que la usan.
// ============================================================
(function () {
  "use strict";

  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  var norm = function (s) {
    return String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  var isValidPrice = function (v) {
    var n = Number(v);
    return Number.isFinite(n) && n > 0 && n < 100000;
  };

  window.DecogasUtil = { esc: esc, norm: norm, isValidPrice: isValidPrice };
}());
