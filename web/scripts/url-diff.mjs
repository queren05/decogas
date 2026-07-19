// url-diff.mjs — Verificación crítica 1:1: los .html del sitio antiguo vs los emitidos en web/dist.
// Cero URLs perdidas, cero inesperadas. Las sitemap-*.xml de la integración NO cuentan.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, '..');
const REPO = path.resolve(WEB, '..');
const OLD = path.join(REPO, 'decogas-web (2)', 'decogas-web');
const DIST = path.join(WEB, 'dist');

function walkHtml(dir, base = dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walkHtml(p, base));
    else if (name.toLowerCase().endsWith('.html')) {
      out.push(path.relative(base, p).split(path.sep).join('/'));
    }
  }
  return out;
}

const oldSet = new Set(walkHtml(OLD));
const distSet = new Set(walkHtml(DIST));

const missing = [...oldSet].filter((u) => !distSet.has(u)).sort();   // en viejo, no en dist
const unexpected = [...distSet].filter((u) => !oldSet.has(u)).sort(); // en dist, no en viejo

console.log('=== Diff 1:1 de URLs (sitio antiguo vs web/dist) ===');
console.log('HTML sitio antiguo:', oldSet.size);
console.log('HTML en web/dist  :', distSet.size);
console.log('URLs perdidas (en viejo, faltan en dist):', missing.length);
missing.forEach((u) => console.log('  - FALTA:', u));
console.log('URLs inesperadas (en dist, no en viejo):', unexpected.length);
unexpected.forEach((u) => console.log('  + EXTRA:', u));

if (missing.length === 0 && unexpected.length === 0) {
  console.log('\nRESULTADO: OK — coincidencia EXACTA 1:1.');
  process.exit(0);
} else {
  console.log('\nRESULTADO: DIFERENCIAS — la fase NO se cierra.');
  process.exit(1);
}
