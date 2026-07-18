// Asigna fotos a productos visibles cuyo slug difiere del nombre de
// archivo del WordPress viejo (mismo modelo, slug escrito distinto).
// Cada candidato se verifica contra el bucket antes de asignar.
// Uso: node asignar-fotos-aprox.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ygailcynbblqvugunleq.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWlsY3luYmJscXZ1Z3VubGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDc2MzAsImV4cCI6MjA5OTY4MzYzMH0.nVAg5hfrZAfECDMNr30BoeMuXuyj_hy4c1LM-FnnY-Q";

// slug del producto → candidatos de archivo en el bucket, por orden de preferencia
const MAPEO = {
  "hisense-ca25y03": ["hisense-ca25yr03-gama-brissa-r-32.jpg"],
  "hisense-ca35y03": ["hisense-ca35yr03-gama-brissa-r-32.jpg"],
  "hisense-ca50xs1a": ["hisense-ca50xs1a-gama-brissa-r-32.jpg"],
  "vaillant-ecotec-intro-vmw-28-28": ["vaillant-ecotec-intro-vmw-28-28-con-vrt50-2-cab.webp"],
  "bosch-condens-c4300i-w-24-25": ["caldera-bosch-condens-4300i-w-24-25.jpg"],
  "bosch-condens-c4300i-w-24-30": ["caldera-bosch-condens-4300i-w-24-30.jpg"],
  "nitromix-condens-24": ["chaffoteaux-nitromix-condens-24.jpg", "nitromix-condens-24.jpg"],
  "mitsubishi-electric-msz-hr25vfk": ["mitsubishi-electric-msz-hr25vf.jpg"],
  "mitsubishi-electric-msz-hr35vfk": ["mitsubishi-electric-msz-hr35vf.jpg"],
  "mitsubishi-electric-msz-hr42vf-wifi": ["mitsubishi-electric-msz-hr42vf.jpg"],
  "mitsubishi-electric-msz-hr50vf-wifi": ["mitsubishi-electric-msz-hr50vf.jpg"],
  "fujitsu-asy40ui-kmcf-wifi": ["fujitsu-asy40ui-km.jpg"],
  "aire-2x1-hisense-2amw42u4rgc-cf25yr04g-cf25yr04g": ["hisense-multisplit-2x1-2amw42u4rgc-cf25yr04-cf25yr04.jpg"],
  "aire-2x1-hisense-2amw52u4rxc-cf25yr04g-cf35mr04g": ["hisense-multisplit-2x1-2amw52u4rxc-cf25yr04-cf35mr04.jpg"],
  "aire-3x1-hisense-3amw62u4rjc-cf25yr04g-cf25yr04g-cf25yr04g": ["hisense-multisplit-3x1-3amw62u4rjc-cf25yr04g-cf25yr04g-cf35mr04g.jpg"],
  "aire-3x1-hisense-3amw72u4rjc-cf35mr04g-cf25yr04g-cf25yr04g": ["hisense-multisplit-3x1-3amw72u4rjc-cf25yr04g-cf35mr04g-cf35mr04g.jpg"],
  "saunier-duval-thema-condens-mi26": ["saunier-duval-thema-condens-mi-26-radio.jpg"],
  "saunier-duval-isofast-condens-35": ["saunier-duval-isofast-condens-mi-35-miset-radio.jpg"],
};

const [email, password] = [process.argv[2], process.argv[3]];
if (!email || !password) { console.error("Uso: node asignar-fotos-aprox.mjs <email> <password>"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) { console.error("Login fallido:", authErr.message); process.exit(1); }

const { data: fotos } = await supabase.storage.from("productos").list("", { limit: 1000 });
const enBucket = new Set((fotos || []).map((o) => o.name));

let asignadas = 0;
const sinCandidato = [];
for (const [slug, candidatos] of Object.entries(MAPEO)) {
  const file = candidatos.find((c) => enBucket.has(c));
  if (!file) { sinCandidato.push(slug); continue; }
  const url = `${SUPABASE_URL}/storage/v1/object/public/productos/${file}`;
  const { error } = await supabase.from("products").update({ img: url }).eq("slug", slug).eq("img", "");
  if (error) console.error("  ERROR", slug, "→", error.message);
  else { asignadas++; console.log("  ✔", slug, "→", file); }
}

console.log(`\nAsignadas (aprox): ${asignadas}`);
if (sinCandidato.length) console.log("Sin archivo candidato en bucket:", sinCandidato.join(", "));
