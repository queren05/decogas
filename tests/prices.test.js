// prices.js — DecogasStore.isValidPrice / normalize / loadCatalog
// y DecogasPrices.load (loadOverrides + toMap en modo demo).
// prices.js no hace early-return ni toca el DOM al cargar: se carga
// limpio en un contexto vm y se leen sus exports en window.
"use strict";

var test = require("node:test");
var assert = require("node:assert");
var h = require("./harness");

function load(opts) {
  var ctx = h.makeContext(opts || {});
  h.runFile(ctx, "utils.js");
  h.runFile(ctx, "prices.js");
  return ctx.window;
}

test("isValidPrice acepta el rango válido 1..99999", function () {
  var w = load();
  var ok = w.DecogasStore.isValidPrice;
  assert.strictEqual(ok(1), true);
  assert.strictEqual(ok(1500), true);
  assert.strictEqual(ok(99999), true);
  assert.strictEqual(ok("1500"), true); // Number() coacciona strings numéricas
});

test("isValidPrice rechaza 0, negativos y el límite 100000", function () {
  var ok = load().DecogasStore.isValidPrice;
  assert.strictEqual(ok(0), false);
  assert.strictEqual(ok(-1), false);
  assert.strictEqual(ok(-9999), false);
  assert.strictEqual(ok(100000), false); // el tope es estricto: n < 100000
});

test("isValidPrice rechaza NaN, no-números, Infinity, null y vacío", function () {
  var ok = load().DecogasStore.isValidPrice;
  assert.strictEqual(ok(NaN), false);
  assert.strictEqual(ok("abc"), false);
  assert.strictEqual(ok(Infinity), false);
  assert.strictEqual(ok(-Infinity), false);
  assert.strictEqual(ok(null), false);       // Number(null) = 0
  assert.strictEqual(ok(undefined), false);   // Number(undefined) = NaN
  assert.strictEqual(ok(""), false);          // Number("") = 0
  assert.strictEqual(ok({}), false);
});

test("normalize devuelve null si falta slug, name o el precio es inválido", function () {
  var w = load();
  var norm = w.DecogasStore.normalize;
  assert.strictEqual(norm(null), null);
  assert.strictEqual(norm({ name: "x", price: 100 }), null);             // sin slug
  assert.strictEqual(norm({ slug: 123, name: "x", price: 100 }), null);  // slug no-string
  assert.strictEqual(norm({ slug: "s", price: 100 }), null);             // sin name
  assert.strictEqual(norm({ slug: "s", name: "x", price: 0 }), null);    // precio inválido
  assert.strictEqual(norm({ slug: "s", name: "x", price: 999999 }), null);
});

test("normalize mapea una fila válida con valores por defecto sensatos", function () {
  var norm = load().DecogasStore.normalize;
  var p = norm({ slug: "cald-24", name: "Caldera 24", price: "1695", ideal_for: "Hasta 100 m²" });
  assert.strictEqual(p.slug, "cald-24");
  assert.strictEqual(p.name, "Caldera 24");
  assert.strictEqual(p.price, 1695);      // convertido a número
  assert.strictEqual(p.idealFor, "Hasta 100 m²"); // ideal_for -> idealFor
  assert.strictEqual(p.brand, "");
  assert.strictEqual(p.specs.length, 0); // (array del realm vm: comparamos longitud, no ref-igualdad)
  assert.strictEqual(p.pop, 999);         // pop ausente -> 999
  assert.strictEqual(p.best, false);
  assert.strictEqual(p.visible, true);    // visible por defecto
});

test("normalize respeta visible=false y best=true explícitos", function () {
  var norm = load().DecogasStore.normalize;
  var p = norm({ slug: "s", name: "n", price: 100, visible: false, best: true, pop: 3 });
  assert.strictEqual(p.visible, false);
  assert.strictEqual(p.best, true);
  assert.strictEqual(p.pop, 3);
});

test("loadCatalog (demo) normaliza y filtra filas inválidas de localStorage", function () {
  var ctx = h.makeContext();
  // Sin DECOGAS_CONFIG => modo demo => lee LS_KEY.
  ctx.window.localStorage.setItem("decogas_products_v2", JSON.stringify({
    calderas: [
      { slug: "ok", name: "Buena", price: 1000 },
      { slug: "mala", name: "Sin precio" } // inválida -> se descarta
    ]
  }));
  h.runFile(ctx, "utils.js");
  h.runFile(ctx, "prices.js");
  return ctx.window.DecogasStore.loadCatalog("calderas").then(function (list) {
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].slug, "ok");
  });
});

test("loadCatalog (demo) devuelve null si no hay datos de esa categoría", function () {
  var w = load();
  return w.DecogasStore.loadCatalog("aires").then(function (list) {
    assert.strictEqual(list, null);
  });
});

test("DecogasPrices.load (demo) incluye calderas, aires Y termos en el mapa", function () {
  // Fix reciente: la cascada debe concatenar las TRES categorías.
  var ctx = h.makeContext();
  ctx.window.localStorage.setItem("decogas_products_v2", JSON.stringify({
    calderas: [{ slug: "cald-1", name: "Caldera", price: 1000, visible: true }],
    aires:    [{ slug: "aire-1", name: "Aire",    price: 800,  visible: false }],
    termos:   [{ slug: "termo-1", name: "Termo",  price: 300,  visible: true }]
  }));
  h.runFile(ctx, "utils.js");
  h.runFile(ctx, "prices.js");
  return ctx.window.DecogasPrices.load().then(function (map) {
    assert.ok(map["cald-1"], "debe incluir calderas");
    assert.ok(map["aire-1"], "debe incluir aires");
    assert.ok(map["termo-1"], "debe incluir termos (fix reciente)");
    assert.strictEqual(map["cald-1"].price, 1000);
    assert.strictEqual(map["aire-1"].visible, false); // toMap conserva la visibilidad
    assert.strictEqual(map["termo-1"].price, 300);
  });
});

test("DecogasPrices.load (demo) descarta filas inválidas al construir el mapa", function () {
  var ctx = h.makeContext();
  ctx.window.localStorage.setItem("decogas_products_v2", JSON.stringify({
    calderas: [{ slug: "buena", name: "Buena", price: 1000 }, { name: "sin slug", price: 500 }]
  }));
  h.runFile(ctx, "utils.js");
  h.runFile(ctx, "prices.js");
  return ctx.window.DecogasPrices.load().then(function (map) {
    assert.deepStrictEqual(Object.keys(map), ["buena"]);
  });
});
