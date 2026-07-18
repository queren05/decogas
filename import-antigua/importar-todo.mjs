// ============================================================
// IMPORTADOR COMPLETO DEL CATÁLOGO ANTIGUO → SUPABASE
// ------------------------------------------------------------
// Hace TODO en un solo comando:
//   1. Login como admin (email + password por argumentos)
//   2. Inserta los 265 productos con visible=false (ocultos en la
//      web pública, visibles en el panel admin para ir activándolos)
//   3. Sube las 265 fotos de fotos/ al bucket 'productos'
//   4. Las URLs de imagen quedan ya en formato público definitivo
//
// Los productos cuyo slug YA exista en tu catálogo actual se
// SALTAN (no se machacan los curados) y se listan al final.
//
// USO (desde la carpeta import-antigua):
//   npm install @supabase/supabase-js
//   node importar-todo.mjs tu-email-admin tu-password
//
// Repetirlo es seguro: los ya insertados se saltan como "existentes".
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// Mismos valores públicos que usa la web (config.js). La anon key
// es pública por diseño; la seguridad la dan las RLS + el login.
const SUPABASE_URL = "https://ygailcynbblqvugunleq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWlsY3luYmJscXZ1Z3VubGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDc2MzAsImV4cCI6MjA5OTY4MzYzMH0.nVAg5hfrZAfECDMNr30BoeMuXuyj_hy4c1LM-FnnY-Q";

const email = process.argv[2] || process.env.DECOGAS_ADMIN_EMAIL;
const password = process.argv[3] || process.env.DECOGAS_ADMIN_PASS;
if (!email || !password) {
  console.error("Uso: node importar-todo.mjs <email-admin> <password>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const raw = JSON.parse(readFileSync(join(HERE, "productos-raw.json"), "utf8"));
const finalMap = new Map(
  JSON.parse(readFileSync(join(HERE, "_final.json"), "utf8")).map((f) => [f.url, f])
);

const CONTENT_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function publicImgUrl(fileName) {
  return `${SUPABASE_URL}/storage/v1/object/public/productos/${fileName}`;
}

const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) {
  console.error("Login fallido:", authErr.message);
  process.exit(1);
}
console.log("Login OK como", email);

// Slugs ya existentes en el catálogo (no se tocan)
const { data: existing, error: exErr } = await supabase.from("products").select("slug");
if (exErr) { console.error("Error leyendo products:", exErr.message); process.exit(1); }
const existingSlugs = new Set((existing || []).map((r) => r.slug));
console.log(`Catálogo actual: ${existingSlugs.size} productos`);

// Filas nuevas
const rows = [];
const skipped = [];
for (const p of raw) {
  const fin = finalMap.get(p.url);
  if (!fin) { skipped.push({ slug: p.slug_raw, motivo: "sin entrada en _final.json" }); continue; }
  if (existingSlugs.has(fin.slug)) { skipped.push({ slug: fin.slug, motivo: "ya existe (no se machaca)" }); continue; }
  const fileName = `${fin.slug}.${fin.ext}`;
  rows.push({
    slug: fin.slug,
    name: p.name,
    brand: p.brand || "",
    category: p.category,
    price: p.price || 0,
    specs: p.specs || [],
    features: [],
    description: p.description || "",
    ideal_for: "",
    efficiency: "",
    img: publicImgUrl(fileName),
    pop: 100,
    best: false,
    visible: false, // ocultos en la web pública hasta revisar precio
  });
}
console.log(`A insertar: ${rows.length} | Saltados: ${skipped.length}`);

// Insertar por lotes
let inserted = 0;
for (let i = 0; i < rows.length; i += 50) {
  const batch = rows.slice(i, i + 50);
  const { error } = await supabase.from("products").insert(batch);
  if (error) { console.error(`Error en lote ${i / 50 + 1}:`, error.message); process.exit(1); }
  inserted += batch.length;
  console.log(`  productos ${inserted}/${rows.length}`);
}

// Subir fotos (todas, upsert: repetir es seguro)
const fotos = readdirSync(join(HERE, "fotos"));
let ok = 0, fail = 0;
for (const f of fotos) {
  const ext = extname(f).slice(1).toLowerCase();
  const body = readFileSync(join(HERE, "fotos", f));
  const { error } = await supabase.storage.from("productos").upload(f, body, {
    upsert: true,
    contentType: CONTENT_TYPES[ext] || "application/octet-stream",
  });
  if (error) { fail++; console.error("  FOTO FALLIDA:", f, "→", error.message); }
  else { ok++; if (ok % 50 === 0) console.log(`  fotos ${ok}/${fotos.length}`); }
}

console.log("\n========== RESUMEN ==========");
console.log(`Productos insertados (ocultos): ${inserted}`);
console.log(`Fotos subidas: ${ok} | fallidas: ${fail}`);
if (skipped.length) {
  console.log(`Saltados (${skipped.length}):`);
  for (const s of skipped) console.log(`  - ${s.slug} (${s.motivo})`);
}
console.log("\nSiguiente paso: abre admin.html, pon precio a los que están a 0");
console.log("y actívalos con el interruptor según los vayas revisando.");
