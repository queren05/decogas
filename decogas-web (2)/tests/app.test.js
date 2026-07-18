// app.js — envío del formulario de contacto (solo la rama de envío).
// Fix reciente (Promise.allSettled):
//   · si TODO se rechaza  => NO se muestra el overlay de éxito (se abre mailto + alert).
//   · si al menos UNO se cumple => sí se muestra el overlay de éxito.
// Se DRIVE el IIFE con DOM falso y fetch controlado.
"use strict";

var test = require("node:test");
var assert = require("node:assert");
var h = require("./harness");

// Monta el formulario con valores válidos y consentimiento marcado.
function bootApp(opts) {
  opts = opts || {};
  var doc = new h.FakeDocument();
  doc.register("infoForm", {});
  doc.register("submitBtn", {});
  doc.register("successOverlay", {});
  doc.register("serviceGroup", {});
  doc.register("consentCheck", { checked: true });
  doc.register("consentRow", {});
  doc.register("nombre", { value: opts.nombre || "Juan Pérez" });
  doc.register("telefono", { value: opts.telefono || "600123123" });
  doc.register("email", { value: opts.email || "juan@example.com" });
  doc.register("mensaje", { value: opts.mensaje || "Quiero información sobre una caldera" });
  // No hay servicio marcado => interest = "Consulta".
  doc.getElementById("infoForm").setQuery('input[name="servicio"]:checked', null);

  var alertCalls = [];
  var win = {
    DECOGAS_CONFIG: opts.config || {},
    alert: function (m) { alertCalls.push(m); }
  };
  var ctx = h.makeContext({ document: doc, window: win, fetch: opts.fetch });
  h.runFile(ctx, "app.js");
  return { doc: doc, win: win, alertCalls: alertCalls };
}

var LIVE_CFG = {
  supabaseUrl: "https://x.supabase.co",
  supabaseAnonKey: "k",
  notifyEmail: "aviso@decogas.com"
};

function submit(doc) {
  doc.getElementById("infoForm").dispatch("submit", { preventDefault: function () {} });
}

test("envío OK (fetch cumple): se muestra el overlay de éxito", function () {
  var b = bootApp({ config: LIVE_CFG, fetch: function () { return Promise.resolve({ ok: true }); } });
  submit(b.doc);
  return h.flush().then(function () {
    assert.strictEqual(b.doc.getElementById("successOverlay").classList.contains("show"), true);
    assert.strictEqual(b.alertCalls.length, 0);
  });
});

test("todo rechazado: NO se muestra el overlay y se avisa al visitante (fix allSettled)", function () {
  var b = bootApp({ config: LIVE_CFG, fetch: function () { return Promise.reject(new Error("sin red")); } });
  submit(b.doc);
  return h.flush().then(function () {
    assert.strictEqual(b.doc.getElementById("successOverlay").classList.contains("show"), false,
      "el overlay de éxito NO debe aparecer si todo falló");
    assert.strictEqual(b.alertCalls.length, 1, "se avisa al visitante con un alert");
    assert.ok(String(b.win.location.href).indexOf("mailto:") === 0, "se abre el gestor de correo");
  });
});

test("éxito parcial (guardar OK, email falla): sí se muestra el overlay", function () {
  var b = bootApp({
    config: LIVE_CFG,
    fetch: function (url) {
      // El POST a la tabla leads cumple; el aviso a formsubmit falla.
      if (String(url).indexOf("formsubmit") !== -1) return Promise.reject(new Error("email caído"));
      return Promise.resolve({ ok: true });
    }
  });
  submit(b.doc);
  return h.flush().then(function () {
    assert.strictEqual(b.doc.getElementById("successOverlay").classList.contains("show"), true);
    assert.strictEqual(b.alertCalls.length, 0);
  });
});

test("modo demo (sin Supabase): guardar en localStorage cumple => overlay de éxito", function () {
  // Sin supabaseUrl, saveLead usa localStorage (Promise resuelta) y no hay red.
  var b = bootApp({ config: {}, fetch: function () { return Promise.reject(new Error("no debería llamarse")); } });
  submit(b.doc);
  return h.flush().then(function () {
    assert.strictEqual(b.doc.getElementById("successOverlay").classList.contains("show"), true);
  });
});

test("validación: email inválido aborta el envío (sin overlay, sin fetch)", function () {
  var fetchCalls = 0;
  var b = bootApp({
    config: LIVE_CFG,
    email: "no-es-email",
    fetch: function () { fetchCalls++; return Promise.resolve({ ok: true }); }
  });
  submit(b.doc);
  return h.flush().then(function () {
    assert.strictEqual(fetchCalls, 0, "no se intenta enviar nada");
    assert.strictEqual(b.doc.getElementById("successOverlay").classList.contains("show"), false);
    assert.strictEqual(b.doc.getElementById("field-email").classList.contains("error"), true);
  });
});

test("validación: sin consentimiento no se envía", function () {
  var fetchCalls = 0;
  var b = bootApp({ config: LIVE_CFG, fetch: function () { fetchCalls++; return Promise.resolve({ ok: true }); } });
  b.doc.getElementById("consentCheck").checked = false;
  submit(b.doc);
  return h.flush().then(function () {
    assert.strictEqual(fetchCalls, 0);
    assert.strictEqual(b.doc.getElementById("successOverlay").classList.contains("show"), false);
  });
});
