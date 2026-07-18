// ============================================================
// build.mjs — Convierte productos-raw.json al esquema destino (Supabase)
// ------------------------------------------------------------
// Genera:
//   productos.csv          (todas las columnas, coma, UTF-8 con BOM)
//   import-products.sql    (upserts idempotentes por slug, visible=false)
//   _colisiones.json       (slugs que chocan con el catalogo curado)
//
// Uso:  node build.mjs   (requiere haber corrido antes scrape.mjs)
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "productos-raw.json");
const OUT_CSV = path.join(__dirname, "productos.csv");
const OUT_SQL = path.join(__dirname, "import-products.sql");
const OUT_COL = path.join(__dirname, "_colisiones.json");

// Slugs del catalogo curado actual (data-*.js) — solo para AVISAR de coincidencias.
const CURATED_SLUGS = new Set([
  "saunier-duval-thematek-condens-24","saunier-duval-thematek-condens-28",
  "vaillant-ecotec-intro-vmw-24-24","vaillant-ecotec-intro-vmw-28-28",
  "bosch-condens-c4300i-w-24-25","bosch-condens-c4300i-w-24-30","nitromix-condens-24",
  "hermann-micracom-condens-24","saunier-duval-thelia-condens-25","saunier-duval-thema-condens-25",
  "saunier-duval-thema-condens-mi26","saunier-duval-isofast-condens-35","hermann-micracom-condens-28",
  "hisense-ca25y03","hisense-ca35y03","hisense-ca50xs1a",
  "aire-2x1-hisense-2amw52u4rxc-cf25yr04g-cf35mr04g","mitsubishi-electric-msz-hr35vfk",
  "mitsubishi-electric-msz-hr42vf-wifi","mitsubishi-electric-msz-hr50vf-wifi",
  "aire-2x1-mitsubishi-electric-mxz-2ha50vf-msz-hr25vfk-msz-hr35vfk","fujitsu-asy25-kn-wifi",
  "fujitsu-asy35-kn-wifi","fujitsu-asy40ui-kmcf-wifi","mitsubishi-electric-msz-hr25vfk",
  "daikin-txf25f-wifi","daikin-txf35f-wifi","daikin-txf42f-wifi","daikin-txf50f-wifi",
  "aire-2x1-hisense-2amw42u4rgc-cf25yr04g-cf25yr04g",
  "aire-3x1-hisense-3amw62u4rjc-cf25yr04g-cf25yr04g-cf25yr04g",
  "aire-3x1-hisense-3amw72u4rjc-cf35mr04g-cf25yr04g-cf25yr04g",
]);

const sqlStr = (v) => "'" + String(v == null ? "" : v).replace(/'/g, "''") + "'";
const sqlJsonb = (arr) => sqlStr(JSON.stringify(arr || [])) + "::jsonb";

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function main() {
  const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));

  // ---- slugs limpios + dedupe ----
  const used = new Set();
  const rows = [];
  const collisions = [];
  let idx = 0;

  for (const r of raw) {
    let slug = r.slug_raw || "producto";
    if (used.has(slug)) {
      let n = 2;
      while (used.has(slug + "-" + n)) n++;
      slug = slug + "-" + n;
    }
    used.add(slug);
    if (CURATED_SLUGS.has(slug)) collisions.push({ slug, name: r.name });

    const ext = (r.image_ext || "jpg").toLowerCase();
    rows.push({
      slug,
      name: r.name || slug,
      brand: r.brand || "",
      category: r.category,           // ya mapeada a calderas|aires|termos
      price: r.price == null ? 0 : r.price,  // 0 = pendiente de precio (entra deshabilitado)
      specs: Array.isArray(r.specs) ? r.specs : [],
      features: [],                   // la web vieja no tiene lista de "features" separada
      description: r.description || "",
      ideal_for: "",                  // no existe en la web vieja; a rellenar por el usuario
      efficiency: "",
      img: "productos/" + slug + "." + ext,
      pop: 100 + idx,                 // 100+ para no pisar el orden de los productos curados (1..13)
      best: false,
      visible: false,                 // NUEVOS entran DESHABILITADOS (precios por revisar)
      _price_missing: r.price == null,
      _img_src: r.image,
      _ext: ext,
      _url: r.url,
    });
    idx++;
  }

  // ---- CSV ----
  const headers = ["slug","name","brand","category","price","specs","features","description","ideal_for","efficiency","img","pop","best","visible"];
  const csvLines = [headers.join(",")];
  for (const p of rows) {
    csvLines.push([
      p.slug, p.name, p.brand, p.category,
      p._price_missing ? "" : p.price,           // celda vacia = precio pendiente
      p.specs.join(" | "), p.features.join(" | "),
      p.description, p.ideal_for, p.efficiency, p.img,
      p.pop, p.best ? "true" : "false", p.visible ? "true" : "false",
    ].map(csvCell).join(","));
  }
  fs.writeFileSync(OUT_CSV, "﻿" + csvLines.join("\r\n") + "\r\n", "utf8");

  // ---- SQL ----
  const priceMissing = rows.filter((p) => p._price_missing).length;
  const byCat = {};
  for (const p of rows) byCat[p.category] = (byCat[p.category] || 0) + 1;

  const header = `-- ============================================================
-- import-products.sql  ·  Importacion del catalogo antiguo (WooCommerce)
-- Generado automaticamente el ${new Date().toISOString().slice(0, 10)}
-- ------------------------------------------------------------
-- QUE HACE:
--   Inserta ${rows.length} productos extraidos de la web vieja (decogas.com)
--   en la tabla public.products de Supabase, mediante UPSERT idempotente
--   por 'slug' (INSERT ... ON CONFLICT (slug) DO UPDATE).
--
-- SEGURIDAD DE TUS DATOS ACTUALES:
--   · NO borra ninguna fila. No hay ningun DELETE ni TRUNCATE.
--   · Los productos que YA tienes (los ~32 actuales) NO se tocan, SALVO
--     que su 'slug' coincida con uno de los importados. En ese caso se
--     ACTUALIZAN sus datos (nombre, precio, ficha, foto...) con los de la
--     web vieja — PERO su 'visible' se CONSERVA (no se re-oculta ni se
--     re-muestra). Coincidencias detectadas con el catalogo actual: ${collisions.length}.
${collisions.map((c) => "--       - " + c.slug).join("\n") || "--       (ninguna)"}
--
-- VISIBILIDAD:
--   · Todos los productos NUEVOS entran con visible = FALSE (deshabilitados),
--     porque los precios estan por revisar. Se activan uno a uno desde el
--     panel de administracion (admin.html) cuando confirmes su precio.
--   · ${priceMissing} productos entran con price = 0 (la web vieja no publicaba
--     su precio): hay que ponerles precio antes de activarlos.
--
-- COMO EJECUTARLO:
--   1. Entra en Supabase → tu proyecto → SQL Editor → New query.
--   2. Pega TODO este archivo y pulsa RUN.
--   3. Al terminar veras el numero de filas afectadas. Repetirlo es seguro
--      (es idempotente: no crea duplicados).
--
-- Reparto por categoria: ${JSON.stringify(byCat)}
-- ============================================================

begin;

`;

  const cols = "(slug, name, brand, category, price, specs, features, description, ideal_for, efficiency, img, pop, best, visible)";
  const stmts = rows.map((p) => {
    const vals = [
      sqlStr(p.slug), sqlStr(p.name), sqlStr(p.brand), sqlStr(p.category), p.price,
      sqlJsonb(p.specs), sqlJsonb(p.features), sqlStr(p.description), sqlStr(p.ideal_for),
      sqlStr(p.efficiency), sqlStr(p.img), p.pop, p.best, p.visible,
    ].join(", ");
    return `insert into public.products ${cols}\nvalues (${vals})\non conflict (slug) do update set\n` +
      "  name = excluded.name, brand = excluded.brand, category = excluded.category,\n" +
      "  price = excluded.price, specs = excluded.specs, features = excluded.features,\n" +
      "  description = excluded.description, ideal_for = excluded.ideal_for,\n" +
      "  efficiency = excluded.efficiency, img = excluded.img, pop = excluded.pop,\n" +
      "  best = excluded.best;  -- 'visible' NO se actualiza: se conserva el valor existente";
  });

  const footer = `\n\ncommit;\n\n-- Verificacion rapida (ejecuta despues del commit):\n-- select category, count(*) filter (where visible) as visibles, count(*) as total\n-- from public.products group by category order by category;\n`;

  fs.writeFileSync(OUT_SQL, header + stmts.join("\n\n") + footer, "utf8");
  fs.writeFileSync(OUT_COL, JSON.stringify(collisions, null, 2), "utf8");

  // Mapeo final slug -> imagen/ext (para descargar fotos y subirlas con el nombre correcto)
  const finalMap = rows.map((p) => ({
    slug: p.slug, img_src: p._img_src, ext: p._ext, img_path: p.img,
    price_missing: p._price_missing, url: p._url,
  }));
  fs.writeFileSync(path.join(__dirname, "_final.json"), JSON.stringify(finalMap, null, 2), "utf8");

  console.log("Filas:", rows.length);
  console.log("Por categoria:", JSON.stringify(byCat));
  console.log("Sin precio (price=0):", priceMissing);
  console.log("Colisiones con catalogo curado:", collisions.length, collisions.map((c) => c.slug).join(", "));
  console.log("CSV:", OUT_CSV);
  console.log("SQL:", OUT_SQL);
}

main();
