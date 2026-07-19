// html2md.mjs — Conversor único (dev) HTML → Markdown para el blog de Decogas (Fase 2).
//
// Recorre los index.html del blog del sitio antiguo, extrae SOLO el contenido del
// artículo (<article class="article-prose"> <div class="wrap">), descarta el resto
// (header/nav/footer y el <section class="article-hero">, que reconstruye el layout),
// convierte a Markdown con turndown (+ gfm para tablas) y emite un .md por artículo
// en web/src/content/blog/<slug>.md con el frontmatter que el layout necesita.
//
// Uso:  node scripts/html2md.mjs
// No inventa fechas (los artículos no traen fecha en el HTML — verificado).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(__dirname, '..');                       // web/
const REPO = path.resolve(WEB, '..');                            // decogas/
const SRC_BLOG = path.join(REPO, 'decogas-web (2)', 'decogas-web', 'blog');
const OUT_BLOG = path.join(WEB, 'src', 'content', 'blog');

// ---- turndown ----
const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**',
  hr: '---',
});
td.use(gfm);

// Encuentra todos los index.html bajo SRC_BLOG (recursivo).
function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

// YAML-safe: siempre como string JSON (comillas dobles, escapes correctos).
const yamlStr = (v) => JSON.stringify(v == null ? '' : String(v));

const files = walk(SRC_BLOG).sort();
const stats = [];
let okCount = 0;
let failCount = 0;

for (const file of files) {
  // slug = ruta relativa a blog/ sin "/index.html". Ej: "caldera/como-encender-caldera"
  const rel = path.relative(SRC_BLOG, file).split(path.sep).join('/');
  const slug = rel.replace(/\/index\.html$/i, '');
  const category = slug.split('/')[0];

  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // ---- hero ----
  const hero = doc.querySelector('.article-hero');
  const title = hero?.querySelector('h1')?.textContent?.trim() || '';
  const tagEl = hero?.querySelector('.guide-tag');
  const tag = tagEl?.textContent?.trim() || '';
  // clase modificadora del tag (la que no es "guide-tag"): caldera | aire | aerotermia
  const tagClass = tagEl
    ? [...tagEl.classList].find((c) => c !== 'guide-tag') || ''
    : '';
  const breadcrumbRaw = hero?.querySelector('.breadcrumb')?.textContent || '';
  const breadcrumb = breadcrumbRaw.split('/').pop().trim(); // última etiqueta
  const metaText = hero?.querySelector('.article-meta')?.textContent || '';
  const rtMatch = metaText.match(/(\d+)\s*min/);
  const readingTime = rtMatch ? Number(rtMatch[1]) : undefined;

  // ---- description ----
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';

  // ---- cuerpo del artículo ----
  const wrap = doc.querySelector('article.article-prose .wrap');

  // Las tablas del WP viejo usan <td><strong> como cabecera en vez de <th>, así que
  // turndown-plugin-gfm no las convierte. Para las tablas SIMPLES (sin colspan/rowspan
  // ni <br> en celdas) promovemos la primera fila td→th → gfm emite tabla Markdown limpia.
  // Las complejas (comparativas multi-línea) se dejan tal cual → gfm las conserva como HTML.
  if (wrap) {
    for (const table of wrap.querySelectorAll('table')) {
      if (table.querySelector('th')) continue;                        // ya tiene cabecera
      if (table.querySelector('[colspan],[rowspan]')) continue;       // compleja → HTML
      if (table.querySelector('br')) continue;                        // celdas multi-línea → HTML
      const firstRow = table.querySelector('tr');
      if (!firstRow) continue;
      const cells = [...firstRow.querySelectorAll(':scope > td')];
      if (!cells.length) continue;
      for (const td of cells) {
        const th = doc.createElement('th');
        th.innerHTML = td.innerHTML;
        td.replaceWith(th);
      }
    }
  }

  const bodyHtml = wrap ? wrap.innerHTML.trim() : '';

  let md = '';
  let ok = true;
  let reason = '';
  try {
    md = td.turndown(bodyHtml).trim();
    if (!wrap) {
      ok = false;
      reason = 'sin <article class="article-prose"> .wrap';
    } else if (md.length < 40) {
      ok = false;
      reason = `markdown demasiado corto (${md.length} chars)`;
    }
  } catch (e) {
    ok = false;
    reason = 'turndown lanzó: ' + e.message;
  }

  // Fallback: si la conversión falla, se conserva el HTML crudo dentro del .md
  // (la colección Markdown de Astro lo renderiza igual). El artículo NO se pierde.
  const body = ok ? md : bodyHtml;

  const fm = [
    '---',
    `title: ${yamlStr(title)}`,
    `description: ${yamlStr(description)}`,
    `category: ${yamlStr(category)}`,
    `slug: ${yamlStr(slug)}`,
    `tag: ${yamlStr(tag)}`,
    `tagClass: ${yamlStr(tagClass)}`,
    `breadcrumb: ${yamlStr(breadcrumb)}`,
    readingTime != null ? `readingTime: ${readingTime}` : null,
    ok ? null : `conversionFailed: true`,
    '---',
    '',
  ].filter((l) => l !== null).join('\n');

  const outFile = path.join(OUT_BLOG, slug + '.md');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, fm + body + '\n', 'utf8');

  // métricas para el muestreo
  const headings = (bodyHtml.match(/<h[1-6][\s>]/gi) || []).length;
  const listItems = (bodyHtml.match(/<li[\s>]/gi) || []).length;
  const images = (bodyHtml.match(/<img[\s>]/gi) || []).length;
  const tables = (bodyHtml.match(/<table[\s>]/gi) || []).length;

  stats.push({ slug, category, title, ok, reason, headings, listItems, images, tables, mdLength: md.length });
  if (ok) okCount++; else failCount++;
}

// Resumen por categoría
const byCat = {};
for (const s of stats) {
  byCat[s.category] = byCat[s.category] || { total: 0, ok: 0, fail: 0 };
  byCat[s.category].total++;
  if (s.ok) byCat[s.category].ok++; else byCat[s.category].fail++;
}

console.log('=== Conversión blog HTML → Markdown ===');
console.log('Total artículos:', stats.length, '| OK:', okCount, '| Fallidos:', failCount);
console.log('Por categoría:');
for (const [cat, c] of Object.entries(byCat)) {
  console.log(`  ${cat}: total ${c.total}, ok ${c.ok}, fallidos ${c.fail}`);
}
if (failCount) {
  console.log('Fallidos (dejados como HTML en la colección):');
  for (const s of stats.filter((x) => !x.ok)) console.log('  -', s.slug, '::', s.reason);
}

// Vuelca stats para el script de muestreo
const statsPath = path.join(__dirname, 'html2md.stats.json');
fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');
console.log('Stats escritas en', statsPath);
