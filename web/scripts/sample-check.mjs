// sample-check.mjs — Revisión por muestreo de la conversión HTML→MD.
// Para una muestra variada compara: (a) frases completas del original presentes en el .md,
// (b) conteo de headings y listas del cuerpo original vs el .md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, '..');
const REPO = path.resolve(WEB, '..');
const OLD = path.join(REPO, 'decogas-web (2)', 'decogas-web', 'blog');
const MD = path.join(WEB, 'src', 'content', 'blog');

// Muestra variada: tablas, listas, imágenes, las 4 categorías.
const SAMPLE = [
  'caldera/como-encender-caldera',                         // listas + imágenes
  'caldera/mejores-calderas-condensacion',                // tabla compleja (HTML) + muchas listas
  'caldera/mejor-aislante-termico-casa',                  // tabla + muchos headings
  'aire-acondicionado/potencia-aire-acondicionado',       // tabla GFM + listas
  'aire-acondicionado/tipos-aire-acondicionado',          // tabla + 20 headings
  'aire-acondicionado/cuanto-consume-aire-acondicionado', // tabla, sin listas
  'aerotermia/suelo-radiante-aerotermia',                 // tabla + 14 listas
  'aerotermia/diferencia-aire-agua-aire-aire-aerotermia', // 2 tablas (una ya con <th>)
  'aerotermia/aerotermia-con-placas-solares',             // texto/listas
  'blog/como-ahorrar-en-calefaccion',                     // categoría blog
];

// Convierte Markdown a texto plano aproximado para poder comparar contra el textContent original.
const mdToPlain = (s) => s
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')          // imágenes → fuera
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')         // enlaces → solo el texto
  .replace(/<[^>]+>/g, ' ')                         // HTML crudo (tablas complejas) → fuera
  .replace(/^\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$/gm, ' ') // filas separadoras de tabla
  .replace(/\|/g, ' ')                             // pipes de tabla
  .replace(/[*_`#>~]/g, ' ');                      // marcadores inline y de bloque

// Normaliza: quita escapes markdown, colapsa espacios, minúsculas.
const norm = (s) => s
  .replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, '$1')
  .replace(/&nbsp;|&#8211;| /g, ' ')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Extrae frases "significativas" (>=6 palabras) del texto plano del original.
function phrases(text) {
  return text
    .split(/(?<=[.:!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 6)
    .slice(0, 200);
}

let allPass = true;
for (const slug of SAMPLE) {
  const htmlFile = path.join(OLD, slug, 'index.html');
  const mdFile = path.join(MD, slug + '.md');
  const html = fs.readFileSync(htmlFile, 'utf8');
  const md = fs.readFileSync(mdFile, 'utf8');
  const dom = new JSDOM(html);
  const wrap = dom.window.document.querySelector('article.article-prose .wrap');

  const origHeadings = wrap.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
  const origLists = wrap.querySelectorAll('li').length;
  const origImgs = wrap.querySelectorAll('img').length;

  // Conteos en el md: headings ## y también los que queden como HTML crudo.
  const mdBody = md.replace(/^---[\s\S]*?---\n/, '');
  const mdHeadings =
    (mdBody.match(/^#{1,6}\s/gm) || []).length +
    (mdBody.match(/<h[1-6][\s>]/gi) || []).length;
  const mdLists =
    (mdBody.match(/^\s*[-*]\s+/gm) || []).length +
    (mdBody.match(/^\s*\d+\.\s+/gm) || []).length +
    (mdBody.match(/<li[\s>]/gi) || []).length;
  const mdImgs =
    (mdBody.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length +
    (mdBody.match(/<img[\s>]/gi) || []).length;

  const normMd = norm(mdToPlain(mdBody));
  const ph = phrases(wrap.textContent);
  let found = 0;
  const misses = [];
  for (const p of ph) {
    if (normMd.includes(norm(p))) found++;
    else misses.push(p);
  }
  const phrasePct = ph.length ? Math.round((found / ph.length) * 100) : 100;

  const headingsOk = mdHeadings >= origHeadings;
  const listsOk = mdLists >= origLists;
  const imgsOk = mdImgs >= origImgs;
  const phrasesOk = phrasePct >= 98;
  const pass = headingsOk && listsOk && imgsOk && phrasesOk;
  if (!pass) allPass = false;

  console.log(`\n${pass ? 'OK ' : 'REV'}  ${slug}`);
  console.log(`   headings orig=${origHeadings} md=${mdHeadings} ${headingsOk ? 'ok' : 'DIFF'}` +
              ` | listas orig=${origLists} md=${mdLists} ${listsOk ? 'ok' : 'DIFF'}` +
              ` | imgs orig=${origImgs} md=${mdImgs} ${imgsOk ? 'ok' : 'DIFF'}`);
  console.log(`   frases significativas: ${found}/${ph.length} presentes (${phrasePct}%)`);
  if (misses.length) {
    console.log('   frases NO encontradas (muestra):');
    misses.slice(0, 3).forEach((m) => console.log('     · ' + m.slice(0, 90)));
  }
}

console.log('\n=== ' + (allPass ? 'MUESTREO OK' : 'MUESTREO CON REVISIÓN') + ' ===');
process.exit(allPass ? 0 : 1);
