// ============================================================
// faq.js — Buscador de la página de preguntas frecuentes.
// Filtra los <details data-faq> por texto (pregunta + respuesta),
// oculta los grupos vacíos y muestra el aviso de "sin resultados".
// ============================================================
(function () {
  "use strict";

  var input = document.getElementById("faqSearch");
  if (!input) return; // solo existe en faq.html

  var norm = window.DecogasUtil.norm;
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-faq]"));
  var groups = Array.prototype.slice.call(document.querySelectorAll("[data-faq-group]"));
  var empty = document.getElementById("faqEmpty");

  // Texto normalizado de cada FAQ, calculado una sola vez
  var textos = items.map(function (el) { return norm(el.textContent); });

  var debounce;
  input.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      var q = norm(input.value.trim());
      var visibles = 0;
      items.forEach(function (el, i) {
        var show = !q || textos[i].indexOf(q) !== -1;
        el.hidden = !show;
        if (show) visibles++;
        if (q && show) el.open = true;
        if (!q) el.open = false;
      });
      groups.forEach(function (g) {
        var any = g.querySelector("[data-faq]:not([hidden])");
        g.hidden = !any;
      });
      if (empty) empty.hidden = visibles > 0;
    }, 120);
  });
})();
