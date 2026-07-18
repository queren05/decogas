// ============================================================
// scrape.mjs — Extrae los 265 productos del WooCommerce viejo (decogas.com)
// ------------------------------------------------------------
// Sin dependencias externas: usa fetch nativo (Node 18+) y node:fs.
// Fuente principal por página: bloque <script type="application/ld+json">
// con @graph -> nodo Product (brand, precio, imagen, descripcion,
// additionalProperty = atributos). Respaldo: metatags og: y el markup
// estandar de WooCommerce (.woocommerce-Price-amount, <h1>).
//
// Uso:  node scrape.mjs
// Genera: productos-raw.json  (lo extraido tal cual)
//         _scrape-fallidas.json (URLs que fallaron tras el reintento)
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URLS_FILE = "C:\\Users\\dr438\\AppData\\Local\\Temp\\claude\\C--Users-dr438\\999b17a7-dd9b-4a36-91a3-42017043462b\\scratchpad\\product-urls.txt";
const OUT_RAW = path.join(__dirname, "productos-raw.json");
const OUT_FAIL = path.join(__dirname, "_scrape-fallidas.json");
const DELAY_MS = 400;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DecogasMigration/1.0 (autorizado por el propietario)";

// ---- Categoria: segmento de la URL -> categoria destino (calderas|aires|termos) ----
// La tabla destino solo admite esas 3 categorias (CHECK). Mapeo de las demas:
const CATEGORY_MAP = {
  "calderas": "calderas",
  "calderas-de-gasoil": "calderas",
  "estufas-pellets": "calderas",
  "radiadores": "calderas",
  "aire-acondicionado": "aires",
  "termos": "termos",
  "calentadores": "termos",
};

// ---- Marcas conocidas (para inferir cuando el ld+json no trae brand) ----
const BRANDS = [
  "Saunier Duval", "Mitsubishi Electric", "Mitsubishi", "Bosch", "Vaillant", "Daikin",
  "Samsung", "Ferroli", "Junkers", "Ariston", "Fujitsu", "LG", "Haier", "Hisense",
  "Baxi", "Protherm", "Hermann", "Wolf", "Viessmann", "Chaffoteaux", "Domusa",
  "Demirdokum", "Nitromix", "Giatsu", "Giatsu Aroma", "Thermor", "Cabel", "Rayco",
  "Fondital", "Netatmo", "Myuet", "Thermor", "Ariston", "Bosch", "Hitachi", "Panasonic",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  if (!s) return "";
  return String(s)
    .replace(/&euro;/g, "€").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&#8217;/g, "’").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó").replace(/&Uacute;/g, "Ú").replace(/&Ntilde;/g, "Ñ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

// "1.400,00" (formato ES) o "1400.00" -> 1400
function parsePrice(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    // formato ES: punto = miles, coma = decimales
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function inferBrand(name) {
  const low = " " + name.toLowerCase() + " ";
  // ordenar por longitud para dar prioridad a "Mitsubishi Electric" sobre "Mitsubishi"
  const sorted = [...new Set(BRANDS)].sort((a, b) => b.length - a.length);
  for (const b of sorted) {
    if (low.includes(" " + b.toLowerCase())) return b;
  }
  return "";
}

// Atributo WooCommerce "pa_consumo-de-agua-caliente" -> "Consumo de agua caliente"
function prettyAttr(name) {
  let s = String(name).replace(/^pa_/, "").replace(/[-_]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function extExtractFrom(url) {
  const m = String(url || "").match(/\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function slugFromUrl(url) {
  let seg = url.replace(/\/+$/, "").split("/").pop() || "";
  seg = seg.replace(/-producto$/, "");
  seg = seg.replace(/-copia$/, ""); // basura de productos duplicados en WP
  return seg || "producto";
}

function categoryFromUrl(url) {
  const m = url.match(/decogas\.com\/([^/]+)\//);
  const seg = m ? m[1] : "";
  return { seg, cat: CATEGORY_MAP[seg] || "calderas" };
}

function getLdProduct(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const b of blocks) {
    let json;
    try { json = JSON.parse(b[1]); } catch { continue; }
    const graph = json["@graph"] || (Array.isArray(json) ? json : [json]);
    const prod = graph.find((n) => {
      const t = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
      return t.includes("Product");
    });
    if (prod) return prod;
  }
  return null;
}

function cleanName(s) {
  return stripTags(s).replace(/\s*[-–]\s*Decogas\s*$/i, "").trim();
}

function extract(url, html) {
  const { seg, cat } = categoryFromUrl(url);
  const prod = getLdProduct(html);

  // --- nombre ---
  const h1 = html.match(/<h1[^>]*class="[^"]*product[_-]title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
          || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const ogTitle = (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1];
  let name = "";
  if (h1) name = cleanName(h1[1]);
  if (!name && prod && prod.name) name = cleanName(prod.name);
  if (!name && ogTitle) name = cleanName(ogTitle);

  // --- precio ---
  // Solo dos fuentes FIABLES del propio producto: (1) ld+json offers,
  // (2) el bloque <p class="price"> del resumen del producto. NO usamos un
  // barrido global de .woocommerce-Price-amount porque atrapa precios de
  // productos relacionados / cross-sells y genera precios FALSOS.
  let price = null;
  let price_source = null;
  if (prod && prod.offers) {
    const off = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
    if (off) {
      const p = parsePrice(off.price ?? off.lowPrice ?? off.highPrice);
      if (p != null) { price = p; price_source = "ld"; }
    }
  }
  if (price == null) {
    const pblock = html.match(/<p class="price">([\s\S]*?)<\/p>/i);
    if (pblock) {
      const amt = pblock[1].match(/woocommerce-Price-amount[^>]*>[\s\S]*?<bdi>([\s\S]*?)<\/bdi>/i)
               || pblock[1].match(/woocommerce-Price-amount[^>]*>([\s\S]*?)<\/span>/i);
      if (amt) {
        const p = parsePrice(stripTags(amt[1]));
        if (p != null) { price = p; price_source = "pblock"; }
      }
    }
  }

  // --- imagen ---
  let image = "";
  if (prod && prod.image) {
    const im = Array.isArray(prod.image) ? prod.image[0] : prod.image;
    image = typeof im === "string" ? im : (im && im.url) || "";
  }
  if (!image) image = (html.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || "";
  if (!image) {
    const gal = html.match(/woocommerce-product-gallery[\s\S]*?<img[^>]+src="([^"]+)"/i);
    if (gal) image = gal[1];
  }
  image = decodeEntities(image);

  // --- descripcion ---
  let description = "";
  if (prod && prod.description) description = decodeEntities(prod.description).trim();
  if (!description) {
    const sd = html.match(/<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/i);
    if (sd) description = stripTags(sd[1]);
  }
  if (!description) description = decodeEntities((html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || "");

  // --- marca ---
  let brand = "";
  if (prod && prod.brand) brand = typeof prod.brand === "string" ? prod.brand : (prod.brand.name || "");
  if (!brand) brand = inferBrand(name);
  brand = decodeEntities(brand).trim();

  // --- specs / atributos ---
  const specs = [];
  if (prod && Array.isArray(prod.additionalProperty)) {
    for (const p of prod.additionalProperty) {
      if (!p || p.value == null || p.value === "") continue;
      const label = prettyAttr(p.name);
      const value = decodeEntities(String(p.value)).trim();
      if (label && value) specs.push(label + ": " + value);
    }
  }
  if (!specs.length) {
    // respaldo: tabla de atributos WooCommerce
    const tbl = html.match(/<table[^>]*class="[^"]*woocommerce-product-attributes[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (tbl) {
      const rows = [...tbl[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (const r of rows) {
        const label = stripTags((r[1].match(/<th[^>]*>([\s\S]*?)<\/th>/i) || [])[1] || "");
        const value = stripTags((r[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i) || [])[1] || "");
        if (label && value) specs.push(label + ": " + value);
      }
    }
  }

  const sku = prod && prod.sku ? String(prod.sku) : "";
  const ldCategory = prod && prod.category ? (typeof prod.category === "string" ? prod.category : "") : "";

  return {
    url,
    slug_raw: slugFromUrl(url),
    url_segment: seg,
    name,
    price,
    price_source,
    category: cat,
    brand,
    image,
    image_ext: extExtractFrom(image),
    description,
    specs,
    sku,
    ld_category: ldCategory,
    had_ld_product: Boolean(prod),
  };
}

async function fetchHtml(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9" }, redirect: "follow" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.text();
}

async function main() {
  const urls = fs.readFileSync(URLS_FILE, "utf8")
    .split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l));
  console.log("URLs a procesar:", urls.length);

  const results = [];
  const failed = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const html = await fetchHtml(url);
      const data = extract(url, html);
      results.push(data);
      const flag = (data.price == null ? " [SIN PRECIO]" : "") + (!data.name ? " [SIN NOMBRE]" : "") + (!data.image ? " [SIN IMG]" : "");
      console.log(`[${i + 1}/${urls.length}] OK ${data.slug_raw} — ${data.price ?? "?"}€${flag}`);
    } catch (e) {
      console.log(`[${i + 1}/${urls.length}] FALLO ${url} -> ${e.message}`);
      failed.push({ url, error: String(e.message) });
    }
    await sleep(DELAY_MS);
  }

  // ---- Reintento (1 vez) de las fallidas ----
  const stillFailed = [];
  if (failed.length) {
    console.log("\nReintentando", failed.length, "fallidas...");
    for (const f of failed) {
      try {
        const html = await fetchHtml(f.url);
        results.push(extract(f.url, html));
        console.log("  Reintento OK:", f.url);
      } catch (e) {
        console.log("  Reintento FALLO:", f.url, "->", e.message);
        stillFailed.push({ url: f.url, error: String(e.message) });
      }
      await sleep(DELAY_MS);
    }
  }

  // Mantener el orden original de las URLs
  const order = new Map(urls.map((u, idx) => [u, idx]));
  results.sort((a, b) => (order.get(a.url) ?? 0) - (order.get(b.url) ?? 0));

  fs.writeFileSync(OUT_RAW, JSON.stringify(results, null, 2), "utf8");
  fs.writeFileSync(OUT_FAIL, JSON.stringify(stillFailed, null, 2), "utf8");

  // ---- Resumen ----
  const byCat = {};
  let minP = Infinity, maxP = -Infinity, noPrice = 0, noImg = 0, noName = 0;
  for (const r of results) {
    byCat[r.category] = (byCat[r.category] || 0) + 1;
    if (r.price != null) { minP = Math.min(minP, r.price); maxP = Math.max(maxP, r.price); } else noPrice++;
    if (!r.image) noImg++;
    if (!r.name) noName++;
  }
  console.log("\n===== RESUMEN SCRAPE =====");
  console.log("Extraidos:", results.length, "/", urls.length);
  console.log("Por categoria:", JSON.stringify(byCat));
  const bySrc = {};
  for (const r of results) bySrc[r.price_source || "none"] = (bySrc[r.price_source || "none"] || 0) + 1;
  console.log("Rango de precios:", isFinite(minP) ? `${minP}€ - ${maxP}€` : "n/d", "| sin precio:", noPrice);
  console.log("Fuente de precio:", JSON.stringify(bySrc));
  console.log("Sin imagen:", noImg, "| sin nombre:", noName);
  console.log("Fallidas definitivas:", stillFailed.length);
  if (stillFailed.length) console.log(JSON.stringify(stillFailed, null, 2));
}

main().catch((e) => { console.error("ERROR FATAL:", e); process.exit(1); });
