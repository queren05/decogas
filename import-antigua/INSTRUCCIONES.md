# Importación del catálogo antiguo → Decogas (Supabase)

Este paquete migra los **265 productos** de la web vieja de WooCommerce
(`decogas.com`) al catálogo nuevo (tabla `public.products` de Supabase).

> **Importante — los productos nuevos entran DESHABILITADOS (`visible = false`).**
> Los precios de la web vieja están por revisar, así que ningún producto
> importado se mostrará en la web hasta que tú lo actives, uno a uno, desde el
> panel de administración (`admin.html`). Los productos que **ya tenías** en
> Supabase **no se tocan** (ver más abajo).

---

## Archivos de esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `productos-raw.json` | Lo extraído de cada página tal cual (nombre, precio, categoría, marca, imagen, descripción, specs, sku…). Copia de seguridad / auditoría. |
| `productos.csv` | Todas las columnas en CSV (UTF-8 con BOM, se abre bien en Excel). Para revisar de un vistazo. La celda de **precio vacía** = producto sin precio en la web vieja. |
| `import-products.sql` | **El importador.** Upserts idempotentes por `slug` para las 265 filas. Se ejecuta en el SQL Editor de Supabase. |
| `fotos/` | Las 265 imágenes principales, ya descargadas, con nombre `<slug>.<ext>`. |
| `subir-fotos.mjs` | Sube las fotos de `fotos/` al bucket `productos` de Supabase. |
| `scrape.mjs` / `build.mjs` / `download-fotos.mjs` | Scripts que generaron todo lo anterior (por si hay que repetir el proceso). |
| `_colisiones.json`, `_final.json`, `_*-fallidas.json` | Auxiliares de auditoría. |

---

## Pasos EN ORDEN

### 1) Importar los productos a la base de datos
1. Entra en **Supabase → tu proyecto → SQL Editor → New query**.
2. Abre `import-products.sql`, **copia todo** y pégalo en el editor.
3. Pulsa **RUN**.
4. Es **idempotente**: puedes volver a ejecutarlo sin crear duplicados.

Al terminar, comprueba con:
```sql
select category, count(*) filter (where visible) as visibles, count(*) as total
from public.products group by category order by category;
```

### 2) Subir las fotos al bucket `productos`
1. Necesitas **Node** (ya lo tienes) y, una sola vez, instalar la librería:
   ```powershell
   cd "C:\Users\dr438\decogas\import-antigua"
   npm install @supabase/supabase-js
   ```
2. Ejecuta el subidor con **tu email y contraseña de admin** (los mismos con los
   que entras en `admin.html`; se crean en Supabase → Authentication → Users).
   Las credenciales **no se guardan en ningún archivo**:
   ```powershell
   node subir-fotos.mjs tucorreo@ejemplo.com tu-contrasena
   ```
   O con variables de entorno:
   ```powershell
   $env:DECOGAS_ADMIN_EMAIL="tucorreo@ejemplo.com"
   $env:DECOGAS_ADMIN_PASSWORD="tu-contrasena"
   node subir-fotos.mjs
   ```
   > Si da error de permisos al subir, asegúrate de haber ejecutado antes
   > `setup-supabase-v5.sql` (crea el bucket `productos`) y, si aplicaste el
   > `v6`, de que tu email es exactamente el del administrador autorizado.

### 3) (IMPORTANTE) Hacer que las fotos se vean en la web
El importador guarda en la columna `img` la ruta **`productos/<slug>.<ext>`**
(la ruta dentro del bucket). Pero la web muestra la imagen usando ese valor
**tal cual** como `src`, así que una ruta relativa **no se cargará** hasta
convertirla en URL pública completa. Después de subir las fotos (paso 2),
ejecuta este SQL **una vez** en el SQL Editor:

```sql
update public.products
set img = 'https://ygailcynbblqvugunleq.supabase.co/storage/v1/object/public/'
          || img
where img like 'productos/%';
```

Esto deja, por ejemplo,
`productos/daikin-perfera-txm25r.jpg` →
`https://ygailcynbblqvugunleq.supabase.co/storage/v1/object/public/productos/daikin-perfera-txm25r.jpg`,
que es el formato que ya usa el panel al subir fotos manualmente.

### 4) Revisar precios y activar productos
1. Abre `admin.html` (o tu web de administración) y entra con tu usuario.
2. Verás los 265 productos nuevos **ocultos**. Revisa el **precio** de cada uno
   (los que la web vieja no publicaba entraron con **precio 0** y hay que
   ponérselo antes de activarlos — el panel no deja guardar un precio 0).
3. Cuando un producto esté correcto, actívalo con el **interruptor de
   visibilidad**. Solo entonces aparecerá en la web pública.

---

## Qué NO hace / advertencias

- **No borra nada.** El SQL no tiene ningún `DELETE` ni `TRUNCATE`.
- **Tus productos actuales se conservan.** El upsert es por `slug`. Si un `slug`
  importado **coincide** con uno que ya tenías, se **actualizan** sus datos
  (nombre, precio, ficha, foto…) con los de la web vieja, **pero su
  `visible` se mantiene** (no se re-oculta ni se re-muestra). Coincidencias
  detectadas con el catálogo actual (revísalas si no quieres sobrescribirlas):
  - `saunier-duval-thematek-condens-24`
  - `saunier-duval-thematek-condens-28`
  - `vaillant-ecotec-intro-vmw-24-24`
  - `hermann-micracom-condens-28`
  - `hermann-micracom-condens-24`
  - `saunier-duval-thema-condens-25`
  - `saunier-duval-thelia-condens-25`

  > Si prefieres **no** tocar esas 7 fichas, borra sus 7 bloques `insert … ;`
  > de `import-products.sql` antes de ejecutarlo.

- **Categorías.** La tabla solo admite `calderas`, `aires` y `termos`. Las
  categorías de la web vieja se mapearon así:
  `aire-acondicionado → aires`; `termos` y `calentadores → termos`;
  `calderas`, `calderas-de-gasoil`, `estufas-pellets` y `radiadores → calderas`.
  Revisa desde el panel si quieres recolocar alguno.

- **Fotos de familia repetidas.** Muchas variantes de un mismo modelo (p. ej.
  los multisplit Samsung, la gama ecoTec de Vaillant o los termos por
  capacidad) comparten la **misma** foto en la web vieja. Es normal: cada
  producto tiene su foto correcta, solo que varias coinciden.

- **`specs`** se rellenó con los atributos de WooCommerce que tenía cada
  producto. **`features`, `ideal_for` y `efficiency`** quedaron vacíos (la web
  vieja no los tenía por separado); puedes completarlos desde el panel.
