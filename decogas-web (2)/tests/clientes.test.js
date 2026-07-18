// clientes.js — panel de leads.
//  · normalizeLead: se extrae su texto real y se testea (id, defaults).
//  · Borrado por id: se DRIVE el IIFE en modo LIVE con un Supabase falso,
//    para verificar el fix `String(l.id) !== String(id)`: un lead con id
//    numérico 5 debe eliminarse al borrar con id "5" (string del DOM).
"use strict";

var test = require("node:test");
var assert = require("node:assert");
var h = require("./harness");

// ---------- normalizeLead (unidad, texto real) ----------
var normalizeLead = h.extractFn("clientes.js", "normalizeLead");

test("normalizeLead conserva el id tal cual (numérico o string)", function () {
  assert.strictEqual(normalizeLead({ id: 5, name: "Ana" }).id, 5);
  assert.strictEqual(normalizeLead({ id: "7", name: "Luis" }).id, "7");
});

test("normalizeLead usa null cuando no hay id", function () {
  assert.strictEqual(normalizeLead({ name: "Ana" }).id, null);
});

test("normalizeLead castea a string los campos de texto ausentes", function () {
  var l = normalizeLead({ id: 1 });
  assert.strictEqual(l.name, "");
  assert.strictEqual(l.phone, "");
  assert.strictEqual(l.email, "");
  assert.strictEqual(l.interest, "");
  assert.strictEqual(l.message, "");
  assert.strictEqual(typeof l.created_at, "string"); // fecha por defecto
});

// ---------- Drive del borrado en modo LIVE ----------
// Supabase falso: getSession con sesión válida (carga leads),
// from("leads").select().order() devuelve los leads, delete().eq() ok.
function bootClientesLive(leads) {
  var doc = new h.FakeDocument();
  var deletedWith = { called: false, value: null };

  var fakeSb = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: { user: {} } } }); },
      signInWithPassword: function () { return Promise.resolve({ error: null }); },
      signOut: function () {}
    },
    from: function () {
      return {
        select: function () {
          return { order: function () { return Promise.resolve({ data: leads, error: null }); } };
        },
        delete: function () {
          return {
            eq: function (col, val) {
              deletedWith.called = true;
              deletedWith.value = val;
              return Promise.resolve({ error: null });
            }
          };
        }
      };
    }
  };

  var win = {
    DECOGAS_CONFIG: { supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "k" },
    supabase: { createClient: function () { return fakeSb; } },
    confirm: function () { return true; }
  };
  var ctx = h.makeContext({ document: doc, window: win });
  h.runFile(ctx, "utils.js");
  h.runFile(ctx, "clientes.js");
  return { doc: doc, deletedWith: deletedWith };
}

// Dispara el handler de borrado delegado en document, simulando un click
// sobre un botón .lead-del con data-id = idAttr.
function clickDelete(doc, idAttr) {
  var del = new h.FakeElement();
  del.dataset.id = idAttr;
  del.setQuery(".lead-del", del); // e.target.closest(".lead-del") -> él mismo
  doc.dispatch("click", { target: del });
}

test("borrar con id '5' elimina el lead con id numérico 5 (fix de coerción)", function () {
  var leads = [
    { id: 5, name: "Ana", interest: "Caldera", created_at: "2026-07-10T10:00:00Z" },
    { id: 7, name: "Luis", interest: "Aire", created_at: "2026-07-11T10:00:00Z" }
  ];
  var b = bootClientesLive(leads);
  return h.flush().then(function () {
    // Tras cargar, ambos leads están renderizados y el total es 2.
    assert.strictEqual(b.doc.getElementById("statTotal").textContent, "2");
    assert.ok(b.doc.getElementById("leadsList").innerHTML.indexOf("Ana") !== -1);

    clickDelete(b.doc, "5"); // el DOM entrega el id como string
    return h.flush();
  }).then(function () {
    assert.strictEqual(b.deletedWith.value, "5", "se llamó al delete con el id correcto");
    var html = b.doc.getElementById("leadsList").innerHTML;
    assert.ok(html.indexOf("Ana") === -1, "Ana (id 5) debe desaparecer de la lista");
    assert.ok(html.indexOf("Luis") !== -1, "Luis (id 7) debe seguir");
    assert.strictEqual(b.doc.getElementById("statTotal").textContent, "1",
      "el total baja a 1 tras el borrado");
  });
});

test("borrar un id que no existe deja la lista intacta", function () {
  var leads = [{ id: 5, name: "Ana", interest: "Caldera", created_at: "2026-07-10T10:00:00Z" }];
  var b = bootClientesLive(leads);
  return h.flush().then(function () {
    clickDelete(b.doc, "999");
    return h.flush();
  }).then(function () {
    assert.strictEqual(b.doc.getElementById("statTotal").textContent, "1");
    assert.ok(b.doc.getElementById("leadsList").innerHTML.indexOf("Ana") !== -1);
  });
});
