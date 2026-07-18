# Decogas — Web

Web estática en español de **INSTALADORES DECOGAS SL**: catálogo de calderas, aires
acondicionados y termos/calentadores, calculadora de equipo recomendado, formulario de
contacto, panel de administración del catálogo y panel de clientes. Todo el front es
**HTML + JavaScript vanilla** (sin framework ni paso de build); el backend es **Supabase**
(base de datos + Auth + Storage) y el sitio se publica en **Netlify** (decogas.netlify.app).

El sitio funciona en dos modos, decididos automáticamente en tiempo de ejecución:

- **LIVE**: si `config.js` tiene `supabaseUrl` y `supabaseAnonKey`, los datos se leen y
  escriben en Supabase y los cambios los ven todos los visitantes.
- **DEMO**: si esos campos están vacíos, todo funciona igual pero los cambios se guardan
  solo en el navegador (`localStorage`), útil para probar sin backend.

## Estructura del proyecto

El código vive en `"decogas-web (2)\decogas-web"` (las rutas llevan espacios y paréntesis;
cítalas siempre entre comillas). Los scripts SQL y el `LEEME.txt` están un nivel por
encima, en `"decogas-web (2)"`.

```
decogas/
├─ decogas-web (2)/
│  ├─ setup-supabase-v5.sql        SQL de migración (foto de producto + bucket de Storage)
│  ├─ LEEME.txt                    Nota breve de publicación
│  └─ decogas-web/                 ← RAÍZ que se publica en Netlify
│     ├─ index.html                Portada: hero, secciones, formulario de contacto
│     ├─ calderas.html             Catálogo de calderas
│     ├─ aires.html                Catálogo de aires acondicionados
│     ├─ termos.html               Catálogo de termos y calentadores
│     ├─ calcula.html              Calculadora de equipo recomendado + presupuesto
│     ├─ guias.html                Blog/guías propias
│     ├─ admin.html                Panel de administración del catálogo (login)
│     ├─ clientes.html             Panel de clientes / solicitudes (login)
│     ├─ legal.html                Aviso legal
│     ├─ config.js                 Configuración del backend (Supabase) — ver más abajo
│     ├─ _headers                  Cabeceras de seguridad y caché (formato Netlify)
│     ├─ styles.css, favicon.svg, hero-bg.jpg, robots.txt, sitemap.xml
│     └─ *.js                      Ver "Archivos JavaScript"
```

### Archivos JavaScript

Se cargan como `<script>` clásicos (no módulos), con un query de versión `?v=NN` para
romper la caché. El **orden de carga importa**: `config.js` → `prices.js` → `data-*.js` →
(`catalog.js`/`search.js`/`calcula.js`/`guias.js`) → `app.js`.

**Datos (definen variables globales, sin lógica):**

- `data-calderas.js` — define `window.DECOGAS_DATA` (calderas) y lo registra en
  `window.DECOGAS_DATASETS["calderas"]`. Cada producto: `brand`, `slug`, `name`, `specs[]`,
  `price`, `pop`, `best`, `description`, `features[]`, `idealFor`, `efficiency`.
- `data-aires.js` — igual para aires (`DECOGAS_DATASETS["aires"]`).
- `data-termos.js` — igual para termos (`DECOGAS_DATASETS["termos"]`). El array `products`
  viene vacío: el catálogo de termos se gestiona desde el panel de administración.
- `data-guias.js` — define `window.DECOGAS_GUIAS` (lista de artículos del blog).

Estos archivos son la **última red de seguridad**: los datos que se ven en la web salen de
Supabase si hay conexión, y solo se recurre a estos valores por defecto si el backend falla.

**Lógica compartida:**

- `config.js` — expone `window.DECOGAS_CONFIG` con la configuración del backend. Único
  archivo que hay que tocar para conectar/desconectar Supabase.
- `prices.js` — el almacén de datos (`window.DecogasStore` y `window.DecogasPrices`).
  Implementa la cascada Supabase → localStorage → `data-*.js` (ver abajo). Expone
  `DecogasStore.loadCatalog(category)` que devuelve `Promise<products[]|null>`.
- `app.js` — comportamiento común de todas las páginas: cabecera pegajosa, barra de
  progreso, navegación móvil, animaciones de revelado y contadores, efectos de las
  tarjetas/botones, y el **formulario de contacto de la portada** (validación, guardado del
  lead y aviso por correo).
- `search.js` — buscador global (icono de lupa). Construye un índice de productos de las
  tres categorías (remoto con respaldo local) y lleva a la ficha resaltada (`#p=slug`).

**Por página:**

- `catalog.js` — renderiza los catálogos (calderas, aires, termos). Lee el dataset de la
  página según el atributo `data-page` del `<body>`. Incluye filtros (marca, tipo,
  potencia, orden), buscador de la sección, comparador de hasta 3 productos y fichas
  desplegables. Escapa todo dato antes de insertarlo (anti-XSS).
- `calcula.js` — calculadora de calderas y aires. Estima potencia (kW/frigorías) según
  m² y baños/estancias, elige el equipo óptimo del catálogo real y genera un presupuesto
  instantáneo con financiación y enlace de WhatsApp.
- `guias.js` — renderiza y filtra las guías del blog (usa `DECOGAS_GUIAS`).
- `admin.js` — panel de administración del catálogo (CRUD: precios, fichas, alta/baja,
  visibilidad y subida de fotos). Requiere el SDK de Supabase (se carga en `admin.html`).
- `clientes.js` — panel de clientes: lista las solicitudes del formulario (tabla `leads`)
  con filtros por nombre, fecha e interés. Requiere el SDK de Supabase.

Las páginas `admin.html` y `clientes.html` cargan además el SDK oficial de Supabase por
CDN antes de `config.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

El resto de páginas **no** usan el SDK: hablan con Supabase por REST con `fetch`.

## Cómo servirlo en local

Es un sitio 100% estático: basta con servir la carpeta `"decogas-web (2)\decogas-web"` por
HTTP. No abras los `.html` con doble clic (`file://`) porque los `fetch` y el SDK fallan por
CORS. Desde esa carpeta:

```bash
# Python 3
python -m http.server 8000
```

```bash
# Alternativa con Node
npx serve .
```

Luego abre `http://localhost:8000`. Sin tocar `config.js`, el sitio corre en **modo DEMO**
con los datos de `data-*.js`; con Supabase configurado, corre en **modo LIVE**.

No hay dependencias que instalar, ni scripts de build, ni tests.

## Cascada de datos (Supabase → localStorage → data-*.js)

La lógica está en `prices.js` (`DecogasStore.loadCatalog`) y la consumen `catalog.js`,
`calcula.js` y `search.js`. Para cada categoría se resuelve la primera fuente disponible:

1. **Supabase** — si `config.js` tiene URL y anon key, se hace `GET` a
   `/rest/v1/products?select=*&category=eq.<categoría>&order=pop.asc` (con timeout de
   2,5 s). Si devuelve filas válidas, se usan.
2. **localStorage (modo DEMO)** — si no hay backend configurado, se lee la clave
   `decogas_products_v2` (lo que guarda el panel de administración en modo demo).
3. **data-*.js (por defecto)** — si las dos anteriores no dan resultado (backend caído,
   tabla vacía, sin conexión, demo sin datos), se renderizan los productos del código.

Cada fila se normaliza a un objeto de producto uniforme; las filas sin `slug`, sin `name` o
con precio inválido se descartan. Los productos con `visible === false` se ocultan en la web
pública.

En la portada (`index.html`), `app.js` usa una variante ligera (`DecogasPrices`) que solo
trae `slug`, `price`, `name` y `visible` para actualizar los precios de las tarjetas
estáticas y ocultar los productos marcados como no visibles.

## Configuración de Supabase que espera `config.js`

`config.js` define un único objeto global:

```js
window.DECOGAS_CONFIG = {
  notifyEmail:     "correo@donde-recibir-avisos",   // destinatario de los avisos de nuevos clientes
  supabaseUrl:     "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "tu anon key"                     // clave anónima pública del proyecto Supabase
};
```

- **`supabaseUrl`** y **`supabaseAnonKey`**: si ambos están rellenos, el sitio entra en
  modo LIVE. La clave `anon` está **diseñada para ser pública** (viaja al navegador); la
  seguridad real la imponen las políticas RLS de la base de datos, no el secreto de la
  clave. Aun así, **no se reproduce aquí ningún valor real**: cópialos desde el panel de
  Supabase (Project Settings → API).
- **`notifyEmail`**: correo al que llegan los avisos de nuevos clientes. El envío se hace
  vía FormSubmit.co (`https://formsubmit.co/ajax/<email>`), sin backend propio.

Con Supabase configurado, el código consume:

- **Tabla `products`** (catálogo): `slug`, `name`, `brand`, `category`
  (`calderas`/`aires`/`termos`), `price`, `specs` (array de texto), `features` (array de
  texto), `description`, `ideal_for`, `efficiency`, `img`, `pop`, `best`, `visible`.
- **Tabla `leads`** (solicitudes del formulario): `name`, `phone`, `email`, `interest`,
  `message`, más `id` y `created_at`.
- **Bucket de Storage `productos`** (público): fotos de producto que sube el panel de
  administración.
- **Supabase Auth**: login de los paneles `admin.html` y `clientes.html`
  (`signInWithPassword`); el usuario se crea a mano en Authentication → Users.

Los detalles de despliegue y la configuración crítica de seguridad (políticas RLS y scripts
SQL) están en `DEPLOY.md`.
