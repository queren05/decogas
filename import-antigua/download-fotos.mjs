// ============================================================
// download-fotos.mjs — Descarga la imagen principal de cada producto
// ------------------------------------------------------------
// Guarda en ./fotos/<slug>.<ext> (mismo slug/ext que usa import-products.sql,
// para que la columna img 'productos/<slug>.<ext>' cuadre tras subirlas).
// Delay ~400ms entre descargas. Reintenta 1 vez las fallidas.
//
// Uso:  node download-fotos.mjs   (requiere haber corrido build.mjs)
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FINAL = path.join(__dirname, "_final.json");
const DIR = path.join(__dirname, "fotos");
const DELAY_MS = 400;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DecogasMigration/1.0";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(item) {
  if (!item.img_src) throw new Error("sin URL de imagen");
  const r = await fetch(item.img_src, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 100) throw new Error("archivo demasiado pequeno (" + buf.length + " bytes)");
  fs.writeFileSync(path.join(DIR, item.slug + "." + item.ext), buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const items = JSON.parse(fs.readFileSync(FINAL, "utf8"));
  console.log("Fotos a descargar:", items.length);

  const failed = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      const size = await download(it);
      console.log(`[${i + 1}/${items.length}] OK ${it.slug}.${it.ext} (${(size / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log(`[${i + 1}/${items.length}] FALLO ${it.slug} -> ${e.message}`);
      failed.push(it);
    }
    await sleep(DELAY_MS);
  }

  const stillFailed = [];
  if (failed.length) {
    console.log("\nReintentando", failed.length, "fallidas...");
    for (const it of failed) {
      try { await download(it); console.log("  Reintento OK:", it.slug); }
      catch (e) { console.log("  Reintento FALLO:", it.slug, "->", e.message); stillFailed.push({ slug: it.slug, url: it.img_src, error: String(e.message) }); }
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(path.join(__dirname, "_fotos-fallidas.json"), JSON.stringify(stillFailed, null, 2), "utf8");
  const onDisk = fs.readdirSync(DIR).filter((f) => !f.startsWith("_")).length;
  console.log("\n===== RESUMEN FOTOS =====");
  console.log("Productos:", items.length, "| Fotos en disco:", onDisk, "| Fallidas:", stillFailed.length);
  if (stillFailed.length) console.log(JSON.stringify(stillFailed, null, 2));
}

main().catch((e) => { console.error("ERROR FATAL:", e); process.exit(1); });
