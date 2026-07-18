// Datos de productos — termos y calentadores.
// El catálogo se gestiona desde el panel de administración (admin.html):
// los productos que añadas ahí aparecen automáticamente en esta página.
// Si prefieres tenerlos también aquí como respaldo sin conexión, sigue
// el mismo formato que data-calderas.js.
window.DECOGAS_DATA = {
  page: "termos",
  type: "termo",
  installNote: "Instalación estándar con conexiones incluidas. Consulta condiciones para sustituciones especiales.",
  products: []
};

// Registro para páginas que cargan varios catálogos (admin.html)
window.DECOGAS_DATASETS = window.DECOGAS_DATASETS || {};
window.DECOGAS_DATASETS["termos"] = window.DECOGAS_DATA;
