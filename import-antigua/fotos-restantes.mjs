// Sube al bucket 'productos' SOLO las fotos que aún no estén,
// renovando el login si la sesión caduca a mitad (causa del fallo
// de la primera pasada). Uso: node fotos-restantes.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = "https://ygailcynbblqvugunleq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWlsY3luYmJscXZ1Z3VubGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDc2MzAsImV4cCI6MjA5OTY4MzYzMH0.nVAg5hfrZAfECDMNr30BoeMuXuyj_hy4c1LM-FnnY-Q";

const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) { console.error("Uso: node fotos-restantes.mjs <email> <password>"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const CONTENT_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

async function login() {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { console.error("Login fallido:", error.message); process.exit(1); }
}

await login();
console.log("Login OK");

const { data: existing, error: listErr } = await supabase.storage.from("productos").list("", { limit: 1000 });
if (listErr) { console.error("Error listando bucket:", listErr.message); process.exit(1); }
const enBucket = new Set((existing || []).map((o) => o.name));
const todas = readdirSync(join(HERE, "fotos"));
const faltan = todas.filter((f) => !enBucket.has(f));
console.log(`En bucket: ${enBucket.size} | en fotos/: ${todas.length} | faltan: ${faltan.length}`);

let ok = 0, fail = 0, seguidas = 0, reloginHecho = false;
for (const f of faltan) {
  const ext = extname(f).slice(1).toLowerCase();
  const body = readFileSync(join(HERE, "fotos", f));
  const opts = { upsert: true, contentType: CONTENT_TYPES[ext] || "application/octet-stream" };
  let { error } = await supabase.storage.from("productos").upload(f, body, opts);
  if (error && !reloginHecho) {
    // Un solo relogin en toda la ejecución (evita el rate limit de auth)
    reloginHecho = true;
    await login();
    ({ error } = await supabase.storage.from("productos").upload(f, body, opts));
  }
  if (error) {
    fail++; seguidas++;
    console.error("  FALLIDA:", f, "→", error.message);
    if (seguidas >= 3) {
      console.error("\n3 fallos seguidos: el problema no es la sesión (¿políticas del bucket?). Paro aquí.");
      break;
    }
  } else { ok++; seguidas = 0; if (ok % 25 === 0) console.log(`  ${ok}/${faltan.length}`); }
}

console.log(`\nSubidas: ${ok} | fallidas: ${fail}`);
const { data: fin } = await supabase.storage.from("productos").list("", { limit: 1000 });
const finSet = new Set((fin || []).map((o) => o.name));
const sinFoto = todas.filter((f) => !finSet.has(f));
console.log(`Verificación final: ${todas.length - sinFoto.length}/${todas.length} fotos del rescate están en el bucket`);
if (sinFoto.length) console.log("Siguen faltando:", sinFoto.join(", "));
