# Decogas — Web

Web estática en español de **INSTALADORES DECOGAS SL**: catálogo de calderas, aires
acondicionados y termos/calentadores, calculadora de equipo recomendado, formulario de
contacto, panel de administración del catálogo y panel de clientes. El sitio se construye
con **Astro** (páginas `.astro` + blog en Markdown) pero toda la lógica de cliente sigue
siendo **JavaScript vanilla** (scripts clásicos en `web/public/`); el backend es
**Supabase** (base de datos + Auth + Storage) y se publica en **GitHub Pages** en
**https://queren05.github.io/decogas/** mediante GitHub Actions (cada `push` a `main`
despliega solo; ver `docs/DEPLOY.md`).

> **Repositorio:** `github.com/queren05/decogas`, con despliegue continuo a GitHub Pages.
> Como el sitio se sirve bajo la subruta `/decogas/`, las rutas absolutas y las URLs
> canónicas llevan el prefijo `/decogas/` (p. ej. `robots.txt`, `sitemap.xml` y las
> etiquetas `canonical`/`og:url` apuntan a `queren05.github.io/decogas`).

> **Migración a Astro completada el 19/07/2026** (`docs/MIGRATION-ASTRO.md`). La carpeta
> antigua `"decogas-web (2)"` y las herramientas de importación (`import-antigua/`,
> `web/scripts/`) se eliminaron del repo; siguen disponibles en la historia de git.

El sitio funciona en dos modos, decididos automáticamente en tiempo de ejecución:

- **LIVE**: si `config.js` tiene `supabaseUrl` y `supabaseAnonKey`, los datos se leen y
  escriben en Supabase y los cambios los ven todos los visitantes.
- **DEMO**: si esos campos están vacíos, todo funciona igual pero los cambios se guardan
  solo en el navegador (`localStorage`), útil para probar sin backend.

## Estructura del proyecto

```
decogas/
├─ .github/workflows/pages.yml   CI: construye Astro (web/) y publica web/dist en Pages
├─ README.md                     Este documento
├─ docs/
│  ├─ ARCHITECTURE.md            Arquitectura y análisis técnico
│  ├─ DEPLOY.md                  Despliegue + configuración crítica de Supabase (RLS)
│  └─ MIGRATION-ASTRO.md         Plan histórico de la migración a Astro (completada)
├─ supabase/
│  ├─ setup-supabase-v5.sql      Migración: columna img + bucket de Storage
│  ├─ setup-supabase-v6-seguridad.sql  Endurecimiento de políticas (Storage/RLS)
│  └─ arreglo-storage-admin.sql  Restringe la escritura del bucket al email del admin
├─ package.json                  `npm test` (node --test); sin dependencias
├─ tests/                        Suite de tests (node:test nativo) — ver abajo
└─ web/                          Proyecto Astro
   ├─ astro.config.mjs           base /decogas/, sitemap
   ├─ package.json               astro + @astrojs/sitemap
   ├─ src/
   │  ├─ layouts/                Base.astro, Articulo.astro
   │  ├─ pages/                  index, calderas, aires, termos, calcula, guias,
   │  │                          admin, clientes, legal, 404 y blog/[...slug]
   │  └─ content/blog/           187 artículos en Markdown (aerotermia, aires, calderas)
   └─ public/                    Estáticos servidos tal cual:
      ├─ config.js               Configuración del backend (Supabase) — ver abajo
      ├─ *.js                    Ver "Archivos JavaScript"
      ├─ styles.css, favicon.svg, hero-bg.jpg, robots.txt, .nojekyll
      └─ …
```

> **Aviso — cabeceras de seguridad.** GitHub Pages no soporta cabeceras HTTP
> personalizadas: las cabeceras que aplicaba el hosting anterior (CSP, `X-Frame-Options`,
> `Referrer-Policy`, …) **no están activas** en el sitio publicado. Regresión conocida;
> detalle en `docs/DEPLOY.md`.

### Archivos JavaScript (`web/public/`)

Se cargan como `<script>` clásicos (no módulos), con un query de versión `?v=NN` para
romper la caché. El **orden de carga importa**: `config.js` → `utils.js` → `prices.js` →
`data-*.js` → (`catalog.js`/`search.js`/`calcula.js`/`guias.js`) → `app.js`.

**Datos (definen variables globales, sin lógica):**

- `data-calderas.js` — define `window.DECOGAS_DATA` (calderas) y lo registra en
  `window.DECOGAS_DATASETS["calderas"]`.
- `data-aires.js` — igual para aires; `data-termos.js` — igual para termos (vacío: se
  gestiona desde el panel de administración); `data-guias.js` — `window.DECOGAS_GUIAS`.

Son la **última red de seguridad**: los datos salen de Supabase si hay conexión y solo se
recurre a estos valores por defecto si el backend falla.

**Lógica compartida:**

- `config.js` — expone `window.DECOGAS_CONFIG`. Único archivo que hay que tocar para
  conectar/desconectar Supabase.
- `utils.js` — `window.DecogasUtil` (`esc`, `norm`, `isValidPrice`), compartido por el resto.
- `prices.js` — el almacén de datos (`window.DecogasStore` / `window.DecogasPrices`);
  implementa la cascada Supabase → localStorage → `data-*.js` (ver abajo).
- `app.js` — comportamiento común (cabecera, navegación móvil, animaciones) y el
  formulario de contacto de la portada.
- `search.js` — buscador global; lleva a la ficha resaltada (`#p=slug`).

**Por página:** `catalog.js` (catálogos con filtros y comparador), `calcula.js`
(calculadora + presupuesto), `guias.js` (blog), `admin.js` (panel CRUD del catálogo) y
`clientes.js` (solicitudes de la tabla `leads`). `admin` y `clientes` cargan además el SDK
oficial de Supabase por CDN antes de `config.js`; el resto habla con Supabase por REST
con `fetch`.

## Cómo correrlo en local

Necesitas Node 18+. Desde `web/`:

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:4321/decogas/
npm run build      # genera web/dist (lo que publica Pages)
npm run preview    # sirve el build
```

Sin tocar `config.js`, el sitio corre en **modo DEMO** con los datos de `data-*.js`; con
Supabase configurado, corre en **modo LIVE**.

## Cómo correr los tests

Suite con el runner nativo de Node (`node:test`, **sin dependencias**): `tests/*.test.js`
más `tests/harness.js` (simula navegador y carga los scripts reales de `web/public`).
Desde la **raíz del repo**:

```bash
npm test
```

## Catálogo

El catálogo vive en la tabla `products` de Supabase. Tras importar la web antigua de
WordPress hay **290 productos** (124 calderas, 128 aires y 38 termos), 281 con foto en el
bucket `productos`. Los importados están **ocultos** (`visible=false`) salvo los 32
revisados; **73 productos** tienen un **precio marcador de 1 €** pendiente de revisión.
Las herramientas del rescate (`import-antigua/`) se retiraron del repo una vez importado
todo; están en la historia de git si hicieran falta.

## Cascada de datos (Supabase → localStorage → data-*.js)

La lógica está en `prices.js` (`DecogasStore.loadCatalog`) y la consumen `catalog.js`,
`calcula.js` y `search.js`. Para cada categoría se resuelve la primera fuente disponible:

1. **Supabase** — si `config.js` tiene URL y anon key, `GET` a
   `/rest/v1/products?select=*&category=eq.<categoría>&order=pop.asc` (timeout 2,5 s).
2. **localStorage (modo DEMO)** — clave `decogas_products_v2` (lo que guarda el panel de
   administración en modo demo).
3. **data-*.js (por defecto)** — si las anteriores no dan resultado.

Cada fila se normaliza; las filas sin `slug`, sin `name` o con precio inválido se
descartan. Los productos con `visible === false` se ocultan en la web pública.

## Configuración de Supabase que espera `config.js`

`web/public/config.js` define un único objeto global:

```js
window.DECOGAS_CONFIG = {
  notifyEmail:     "correo@donde-recibir-avisos",   // avisos de nuevos clientes (FormSubmit.co)
  supabaseUrl:     "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "tu anon key"                     // clave anónima pública del proyecto
};
```

La clave `anon` está **diseñada para ser pública**; la seguridad real la imponen las
políticas RLS. Aun así, aquí no se reproduce ningún valor real: cópialos del panel de
Supabase (Project Settings → API).

Con Supabase configurado, el código consume: la tabla **`products`** (catálogo), la tabla
**`leads`** (formulario), el bucket de Storage **`productos`** (fotos) y **Supabase Auth**
(login de `admin` y `clientes`; usuarios creados a mano en Authentication → Users).

Los scripts SQL vivos están en `supabase/` y los detalles de despliegue y seguridad
(políticas RLS, orden de ejecución de los SQL) en `docs/DEPLOY.md`.
