// Catálogo en tiempo de build: lee los productos visibles de Supabase con
// reintentos y verificación de recuento (una respuesta parcial generaría
// páginas de menos). Lo usan las fichas de producto y las páginas de marca.
import cfgRaw from '../../public/config.js?raw';

const grab = (k) => (cfgRaw.match(new RegExp(k + String.raw`:\s*"([^"]*)"`)) || [])[1] || '';

export async function fetchProductosVisibles() {
  const url = grab('supabaseUrl').replace(/\/+$/, '');
  const key = grab('supabaseAnonKey');
  if (!url || !key) return [];
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const res = await fetch(`${url}/rest/v1/products?select=*&visible=eq.true&order=pop.asc`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number((res.headers.get('content-range') || '').split('/')[1]);
      const rows = await res.json();
      if (Number.isFinite(total) && rows.length !== total) {
        throw new Error(`respuesta parcial: ${rows.length}/${total} filas`);
      }
      return rows.filter((p) => p.slug && p.name && Number(p.price) > 0);
    } catch (e) {
      console.warn(`[productos.mjs] Intento ${intento}/3 fallido: ${e.message}`);
      if (intento === 3) return [];
      await new Promise((r) => setTimeout(r, 1500 * intento));
    }
  }
  return [];
}

// "Junkers (grupo Bosch)" → "junkers-grupo-bosch"
export function slugMarca(brand) {
  return String(brand || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function agruparPorMarca(productos) {
  const map = new Map();
  for (const p of productos) {
    const brand = String(p.brand || '').trim();
    if (!brand) continue;
    const slug = slugMarca(brand);
    if (!slug) continue;
    if (!map.has(slug)) map.set(slug, { slug, brand, productos: [] });
    map.get(slug).productos.push(p);
  }
  return [...map.values()].sort((a, b) => b.productos.length - a.productos.length || a.brand.localeCompare(b.brand, 'es'));
}
