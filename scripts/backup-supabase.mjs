// Copia de seguridad de la base de datos de Supabase a JSON con fecha.
//
// Uso (desde la raíz del repo):
//   node scripts/backup-supabase.mjs
//
// - `products` se exporta siempre (la lee con la anon key de web/public/config.js).
// - `leads` contiene datos personales y la anon key NO puede leerlos (RLS):
//   para incluirlos, pasa la service role key por variable de entorno:
//     $env:SUPABASE_SERVICE_KEY = "..." ; node scripts/backup-supabase.mjs
//   (la service key está en Supabase → Project Settings → API. NO subirla al repo.)
//
// Los archivos se guardan en backups/ (ignorada por git).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const cfgSrc = readFileSync(new URL('../web/public/config.js', import.meta.url), 'utf8');
const grab = (key) => (cfgSrc.match(new RegExp(key + String.raw`:\s*"([^"]*)"`)) || [])[1] || '';
const url = grab('supabaseUrl').replace(/\/+$/, '');
const anon = grab('supabaseAnonKey');
if (!url || !anon) {
  console.error('No hay supabaseUrl/supabaseAnonKey en web/public/config.js — nada que respaldar.');
  process.exit(1);
}

const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
const stamp = new Date().toISOString().slice(0, 10);
const outDir = new URL('../backups/', import.meta.url);
mkdirSync(outDir, { recursive: true });

async function dump(table, key) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + page - 1}`,
      },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < page) break;
  }
  const file = new URL(`./${table}-${stamp}.json`, outDir);
  writeFileSync(file, JSON.stringify(rows, null, 1));
  console.log(`${table}: ${rows.length} filas → backups/${table}-${stamp}.json`);
}

await dump('products', anon);
if (serviceKey) {
  await dump('leads', serviceKey);
} else {
  console.log('leads: OMITIDA (define SUPABASE_SERVICE_KEY para incluir los clientes en la copia).');
}
