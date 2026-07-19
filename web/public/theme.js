// ============================================================
// theme.js — Aplica el tema (claro/oscuro) ANTES del primer pintado.
// Se carga bloqueante en el <head> para evitar el parpadeo blanco.
// Prioridad: elección guardada > preferencia del sistema > claro.
// El botón de cambio vive en app.js.
// ============================================================
(function () {
  "use strict";
  var t = null;
  try { t = localStorage.getItem("decogas_theme"); } catch (e) { /* sin almacenamiento */ }
  if (t !== "dark" && t !== "light") {
    t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", t);
})();
