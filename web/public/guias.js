// Renderizado y filtrado de las guías del blog propio.
(function () {
  "use strict";
  var grid = document.getElementById("guideGrid");
  if (!grid || !window.DECOGAS_GUIAS) return;

  var esc = window.DecogasUtil.esc;
  var norm = window.DecogasUtil.norm;
  var CAT_LABEL = { caldera: "Calderas", aire: "Aire acondicionado", aerotermia: "Aerotermia" };
  var CAT = "", Q = "";

  // Las URLs de las guías vienen sin el prefijo del sitio ("/blog/...").
  // Se lo anteponemos con la base real (window.DECOGAS_BASE = "/" en
  // GitHub Pages, "/" en decogas.com) para que no den 404.
  var BASE = (window.DECOGAS_BASE || "/");
  function fullUrl(u) { return BASE + String(u).replace(/^\/+/, ""); }

  function render() {
    var list = window.DECOGAS_GUIAS.filter(function (g) {
      if (CAT && g.cat !== CAT) return false;
      if (Q && norm(g.title).indexOf(Q) === -1) return false;
      return true;
    });
    if (!list.length) {
      grid.innerHTML = '<div class="no-results" style="grid-column:1/-1;">No hay guías que coincidan con tu búsqueda.</div>';
      return;
    }
    grid.innerHTML = list.map(function (g) {
      return '<a class="guide-card" href="' + esc(fullUrl(g.url)) + '">' +
        '<img class="guide-img" src="' + esc(g.img) + '" alt="' + esc(g.title) + '" loading="lazy">' +
        '<span class="guide-body">' +
          '<span class="guide-meta">' +
            '<span class="guide-tag ' + esc(g.cat) + '">' + (CAT_LABEL[g.cat] || "Guía") + "</span>" +
            '<span class="guide-min">' + g.min + " min de lectura</span>" +
          "</span>" +
          '<span class="guide-title">' + esc(g.title) + "</span>" +
          '<span class="guide-link">Leer la guía →</span>' +
        "</span>" +
      "</a>";
    }).join("");
  }

  document.getElementById("guideChips").addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;
    this.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    CAT = btn.dataset.cat;
    render();
  });
  var deb;
  document.getElementById("guideSearch").addEventListener("input", function () {
    clearTimeout(deb);
    var self = this;
    deb = setTimeout(function () { Q = norm(self.value.trim()); render(); }, 150);
  });

  render();
})();
