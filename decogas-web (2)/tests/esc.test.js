// esc() — escapado HTML. Ahora vive en utils.js (window.DecogasUtil.esc)
// y la usan calcula.js / clientes.js / admin.js / catalog.js / search.js /
// guias.js. La testeamos con el texto real extraído de utils.js.
"use strict";

var test = require("node:test");
var assert = require("node:assert");
var h = require("./harness");

var esc = h.extractFn("utils.js", "esc");

test("esc escapa los cinco caracteres peligrosos", function () {
  assert.strictEqual(esc("&"), "&amp;");
  assert.strictEqual(esc("<"), "&lt;");
  assert.strictEqual(esc(">"), "&gt;");
  assert.strictEqual(esc('"'), "&quot;");
  assert.strictEqual(esc("'"), "&#39;");
});

test("esc neutraliza un vector de XSS típico", function () {
  assert.strictEqual(
    esc('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
  );
});

test("esc escapa el & antes que las entidades (sin doble escapado roto)", function () {
  // & se procesa primero: "<" -> "&lt;" y el & de esa entidad NO se re-escapa.
  assert.strictEqual(esc("a<b"), "a&lt;b");
  assert.strictEqual(esc("&amp;"), "&amp;amp;");
});

test("esc trata null y undefined como cadena vacía", function () {
  assert.strictEqual(esc(null), "");
  assert.strictEqual(esc(undefined), "");
});

test("esc convierte números a texto sin alterarlos", function () {
  assert.strictEqual(esc(0), "0");
  assert.strictEqual(esc(1500), "1500");
});

test("esc deja intacto un texto sin caracteres especiales", function () {
  assert.strictEqual(esc("Caldera 24 kW"), "Caldera 24 kW");
});
