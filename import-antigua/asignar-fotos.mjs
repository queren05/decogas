// Asigna foto a los productos VISIBLES que tienen img vacío,
// si existe en el bucket una foto con su mismo slug.
// Uso: node asignar-fotos.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ygailcynbblqvugunleq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWlsY3luYmJscXZ1Z3VubGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDc2MzAsImV4cCI6MjA5OTY4MzYzMH0.nVAg5hfrZAfECDMNr30BoeMuXuyj_hy4c1LM-FnnY-Q";

const [email, password] = [process.argv[2], process.argv[3]];
if (!email || !password) { console.error("Uso: node asignar-fotos.mjs <email> <password>"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) { console.error("Login fallido:", authErr.message); process.exit(1); }
console.log("Login OK");

const { data: fotos, error: fErr } = await supabase.storage.from("productos").list("", { limit: 1000 });
if (fErr) { console.error("Error listando bucket:", fErr.message); process.exit(1); }
const porSlug = new Map();
for (const f of fotos) {
  const punto = f.name.lastIndexOf(".");
  if (punto > 0) porSlug.set(f.name.slice(0, punto), f.name);
}

const { data: sinFoto, error: pErr } = await supabase
  .from("products").select("slug,name").or("img.is.null,img.eq.");
if (pErr) { console.error("Error leyendo products:", pErr.message); process.exit(1); }
console.log(`Productos sin foto: ${sinFoto.length}`);

let asignadas = 0;
const sinMatch = [];
for (const p of sinFoto) {
  const file = porSlug.get(p.slug);
  if (!file) { sinMatch.push(p.slug); continue; }
  const url = `${SUPABASE_URL}/storage/v1/object/public/productos/${file}`;
  const { error } = await supabase.from("products").update({ img: url }).eq("slug", p.slug);
  if (error) { console.error("  ERROR en", p.slug, "→", error.message); }
  else { asignadas++; console.log("  ✔", p.slug); }
}

console.log(`\nFotos asignadas: ${asignadas}`);
if (sinMatch.length) {
  console.log(`Sin foto en el bucket (subirlas a mano desde el panel): ${sinMatch.length}`);
  for (const s of sinMatch) console.log("  -", s);
}
