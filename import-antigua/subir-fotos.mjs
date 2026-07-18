// ============================================================
// subir-fotos.mjs — Sube las fotos de ./fotos/ al bucket 'productos' de Supabase
// ------------------------------------------------------------
// REQUISITO (una sola vez):
//     npm install @supabase/supabase-js
//
// USO (las credenciales del admin NUNCA van escritas en el archivo):
//   Opcion A — variables de entorno (recomendado):
//     PowerShell:
//       $env:DECOGAS_ADMIN_EMAIL="tucorreo@ejemplo.com"
//       $env:DECOGAS_ADMIN_PASSWORD="tu-contrasena"
//       node subir-fotos.mjs
//   Opcion B — argumentos:
//       node subir-fotos.mjs tucorreo@ejemplo.com tu-contrasena
//
//   El email/contrasena son los del usuario admin creado en
//   Supabase → Authentication → Users (el mismo con el que entras en admin.html).
//
// QUE HACE:
//   Inicia sesion (signInWithPassword) y sube TODAS las imagenes de ./fotos/
//   al bucket 'productos' con upsert (sobreescribe si ya existe). El nombre
//   del objeto es <slug>.<ext>, igual que la columna img del import SQL.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "fotos");
const BUCKET = "productos";
const DELAY_MS = 150;

// Config publica del proyecto (copiada de decogas-web/config.js).
// La clave "anon" esta DISENADA para ser publica: no da permisos de escritura
// por si misma; la subida solo funciona tras iniciar sesion como admin (RLS).
const SUPABASE_URL = "https://ygailcynbblqvugunleq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWlsY3luYmJscXZ1Z3VubGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDc2MzAsImV4cCI6MjA5OTY4MzYzMH0.nVAg5hfrZAfECDMNr30BoeMuXuyj_hy4c1LM-FnnY-Q";

const CONTENT_TYPE = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const email = process.env.DECOGAS_ADMIN_EMAIL || process.argv[2];
  const password = process.env.DECOGAS_ADMIN_PASSWORD || process.argv[3];
  if (!email || !password) {
    console.error("ERROR: faltan las credenciales del admin.");
    console.error("  Usa:  node subir-fotos.mjs <email> <password>");
    console.error("  o define $env:DECOGAS_ADMIN_EMAIL y $env:DECOGAS_ADMIN_PASSWORD");
    process.exit(1);
  }
  if (!fs.existsSync(DIR)) { console.error("No existe la carpeta fotos/. Ejecuta antes download-fotos.mjs."); process.exit(1); }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

  console.log("Iniciando sesion como", email, "...");
  const { error: authErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (authErr) { console.error("Fallo de login:", authErr.message); process.exit(1); }
  console.log("Sesion iniciada. Subiendo fotos al bucket '" + BUCKET + "'...\n");

  const files = fs.readdirSync(DIR).filter((f) => !f.startsWith("_") && /\.(jpe?g|png|webp|gif|avif)$/i.test(f));
  const failed = [];
  let ok = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = f.split(".").pop().toLowerCase();
    const body = fs.readFileSync(path.join(DIR, f));
    const { error } = await sb.storage.from(BUCKET).upload(f, body, {
      upsert: true,
      contentType: CONTENT_TYPE[ext] || "application/octet-stream",
      cacheControl: "31536000",
    });
    if (error) { console.log(`[${i + 1}/${files.length}] FALLO ${f} -> ${error.message}`); failed.push({ file: f, error: error.message }); }
    else { ok++; if ((i + 1) % 25 === 0 || i === files.length - 1) console.log(`[${i + 1}/${files.length}] subidas ${ok} OK`); }
    await sleep(DELAY_MS);
  }

  console.log("\n===== RESUMEN SUBIDA =====");
  console.log("Subidas OK:", ok, "/", files.length, "| fallidas:", failed.length);
  if (failed.length) { console.log(JSON.stringify(failed, null, 2)); process.exit(1); }
  console.log("\nListo. Las fotos ya estan en el bucket 'productos'.");
  console.log("URL publica de cada una: " + SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/<slug>.<ext>");
}

main().catch((e) => { console.error("ERROR FATAL:", e); process.exit(1); });
