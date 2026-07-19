// ============================================================
// search.js — Buscador global de productos (todas las páginas)
// Busca por nombre o marca en calderas y aires. Los resultados
// llevan a la página del catálogo y resaltan la ficha (#p=slug).
// ============================================================
(function () {
  "use strict";

  var btn = document.getElementById("searchBtn");
  var overlay = document.getElementById("searchOverlay");
  var backdrop = document.getElementById("searchBackdrop");
  var input = document.getElementById("globalSearch");
  var resultsBox = document.getElementById("searchResults");
  if (!btn || !overlay || !input || !resultsBox) return;

  var esc = window.DecogasUtil.esc;
  var norm = window.DecogasUtil.norm;

  // ---------- Índice de productos (remoto con fallback local) ----------
  var indexPromise = null;
  function buildIndex() {
    if (indexPromise) return indexPromise;
    var local = function (cat) {
      var ds = (window.DECOGAS_DATASETS || {})[cat];
      return (ds ? ds.products : []).map(function (p) {
        return { slug: p.slug, name: p.name, brand: p.brand, price: p.price, category: cat, visible: true };
      });
    };
    var one = function (cat) {
      if (!window.DecogasStore) return Promise.resolve(local(cat));
      return window.DecogasStore.loadCatalog(cat).then(function (remote) {
        return (remote && remote.length ? remote : local(cat));
      }).catch(function () { return local(cat); });
    };
    indexPromise = Promise.all([one("calderas"), one("aires"), one("termos")]).then(function (lists) {
      return lists[0].concat(lists[1]).concat(lists[2]).filter(function (p) { return p.visible !== false; });
    });
    return indexPromise;
  }

  // ---------- Apertura / cierre ----------
  function open() {
    overlay.classList.add("open");
    if (backdrop) backdrop.classList.add("open");
    setTimeout(function () { input.focus(); }, 200);
    buildIndex();
  }
  function close() {
    overlay.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    input.value = "";
    resultsBox.innerHTML = "";
  }

  btn.addEventListener("click", open);
  document.getElementById("searchClose").addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  // ---------- Búsqueda ----------
  var ICONS = {
    calderas: '<svg width="18" height="18" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="10.5" cy="7" r="1.3"/><circle cx="13.5" cy="7" r="1.3"/><path d="M9.5 16c.8-1.2 1.7-1.2 2.5 0s1.7 1.2 2.5 0"/></svg>',
    termos: '<svg width="18" height="18" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="17" rx="4"/><path d="M10 22h4M12 19v3"/><circle cx="12" cy="9" r="2.2"/></svg>',
    aires: '<svg width="18" height="18" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="9" rx="2.5"/><path d="M5 17c1-1.4 2-1.4 3 0M10.5 18c1-1.4 2-1.4 3 0M16 17c1-1.4 2-1.4 3 0"/></svg>'
  };
  var PAGE = document.body.getAttribute("data-page");

  function render(list, q) {
    if (!q) { resultsBox.innerHTML = ""; return; }
    var matches = list.filter(function (p) {
      return norm(p.name + " " + p.brand).indexOf(q) !== -1;
    }).slice(0, 7);

    if (!matches.length) {
      resultsBox.innerHTML = '<div class="search-empty">Sin resultados para "' + esc(q) + '". Prueba con la marca o el modelo.</div>';
      return;
    }
    resultsBox.innerHTML = matches.map(function (p) {
      var page = p.category === "calderas" ? "calderas.html" : p.category === "termos" ? "termos.html" : "aires.html";
      return '<a class="search-result" href="' + page + '#p=' + esc(p.slug) + '">' +
        '<span class="sr-icon">' + ICONS[p.category] + "</span>" +
        '<span class="sr-info">' +
          '<span class="sr-name">' + esc(p.name) + "</span>" +
          '<span class="sr-meta">' + esc(p.brand) + " · " + (p.category === "calderas" ? "Caldera" : p.category === "termos" ? "Termo / Calentador" : "Aire acondicionado") + "</span>" +
        "</span>" +
        '<span class="sr-price">' + Number(p.price).toLocaleString("es-ES") + " €</span>" +
      "</a>";
    }).join("");
  }

  var debounce;
  input.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      var q = norm(input.value.trim());
      buildIndex().then(function (list) { render(list, q); });
    }, 120);
  });

  // Al hacer clic en un resultado de la MISMA página, cerrar overlay
  // (el hashchange dispara el resaltado en catalog.js)
  resultsBox.addEventListener("click", function (e) {
    var a = e.target.closest(".search-result");
    if (!a) return;
    var samePage = (PAGE === "calderas" && a.href.indexOf("calderas.html") !== -1) ||
                   (PAGE === "termos" && a.href.indexOf("termos.html") !== -1) ||
                   (PAGE === "aires" && a.href.indexOf("aires.html") !== -1);
    if (samePage) close();
  });
})();
