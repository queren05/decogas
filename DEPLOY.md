# Despliegue — Decogas

Guía para publicar la web en producción (Netlify) y configurar el backend (Supabase).
Todas las rutas del repo llevan espacios y paréntesis; cítalas siempre entre comillas.

La **carpeta que se publica** es `"decogas-web (2)\decogas-web"` (no el nivel superior: los
`.sql` y el `LEEME.txt` de `"decogas-web (2)"` no forman parte del sitio).

## Publicar en Netlify

El sitio es estático, sin build. Hay dos formas:

### Opción A — Arrastrar la carpeta (la que describe `LEEME.txt`)

1. Si aún no lo hiciste, ejecuta los scripts SQL en Supabase (ver más abajo).
2. Entra en `https://app.netlify.com/drop` y arrastra **la carpeta `decogas-web` entera**
   (la que contiene los `.html`), no su carpeta padre.
3. Recarga con `Ctrl + Shift + R` para saltarte la caché.

### Opción B — Deploy continuo desde Git

1. Conecta el repositorio en Netlify.
2. Configura **Base directory** = `decogas-web (2)/decogas-web` y **Publish directory** =
   el mismo. **Build command**: vacío (no hay build).
3. Cada push publica automáticamente.

En ambos casos, `config.js` viaja tal cual al navegador: la URL y la anon key de Supabase
quedan en el sitio publicado (es lo esperado; ver la sección de seguridad).

## Qué hace el archivo `_headers`

`_headers` está en la raíz publicada y Netlify lo aplica como cabeceras HTTP (si algún día
se aloja en otro proveedor, hay que replicarlas en su configuración). Define:

- **Cabeceras de seguridad** para todas las rutas (`/*`):
  - `X-Frame-Options: DENY` y `frame-ancestors 'none'` — impiden incrustar el sitio en
    iframes (anti-clickjacking).
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `Permissions-Policy` (cámara, micrófono y geolocalización deshabilitados).
  - **`Content-Security-Policy`** que restringe de dónde se cargan recursos. Puntos clave:
    - `script-src 'self' https://cdn.jsdelivr.net` — permite el SDK de Supabase por CDN.
    - `connect-src 'self' https://*.supabase.co https://formsubmit.co` — permite las
      llamadas REST/Auth a Supabase y el envío de avisos por FormSubmit.
    - `style-src` con Google Fonts, `img-src 'self' data: https:`, `form-action 'self'
      mailto:`.
  - Si añades un nuevo servicio externo (otro dominio de API, otra fuente de scripts),
    tendrás que ampliar la CSP o el navegador bloqueará la petición.
- **Caché de estáticos**: `styles.css` (5 min), `hero-bg.jpg` y `favicon.svg` (7 días).

## Configuración de Supabase (crítica)

> Sin esta configuración el sitio sigue cargando, pero en **modo DEMO** (los cambios solo se
> guardan en el navegador de cada visitante). El modo LIVE exige el backend bien montado.

### 1. Rellenar `config.js`

En `"decogas-web (2)\decogas-web\config.js"`, pon la URL del proyecto y la anon key
(Supabase → Project Settings → API) y el correo de avisos. **No publiques valores reales de
claves en la documentación**; cópialos directamente en el archivo:

```js
window.DECOGAS_CONFIG = {
  notifyEmail:     "correo@donde-recibir-avisos",
  supabaseUrl:     "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "tu anon key"
};
```

### 2. Scripts SQL que hay que haber ejecutado (Supabase → SQL Editor)

El código da por hecho que la base de datos ya tiene las tablas `products` y `leads` con sus
políticas y el bucket de Storage. Estos scripts se ejecutan **una sola vez** por proyecto:

- **`setup-supabase-v3.sql`** — crea/migra la tabla **`products`** con todas sus columnas
  (fichas completas, no solo precios). Referenciado en el código en `admin.js:184` y
  `admin.js:188` (mensajes que piden ejecutarlo si la tabla está vacía o usa el formato
  antiguo).
- **`setup-supabase-v4.sql`** — crea la tabla **`leads`** y sus políticas. Referenciado en
  `clientes.js:85` (mensaje de error al leer clientes: «¿ejecutaste setup-supabase-v4.sql?»).
- **`setup-supabase-v5.sql`** — **es el único que está en el repo** (en `"decogas-web (2)"`).
  Añade la columna `img` a `products` y crea el bucket público de Storage `productos` con sus
  permisos (lectura pública; subida/actualización/borrado solo para usuarios autenticados).
  Referenciado en `admin.js:402`.

> **Aviso importante — scripts ausentes del repo.** `setup-supabase-v3.sql` y
> `setup-supabase-v4.sql` **NO están en el repositorio**; solo se mencionan por su nombre en
> el código. `setup-supabase-v5.sql` es un `ALTER TABLE` que **presupone que `products` ya
> existe** (creada por v3) y no crea la tabla `leads` (la crea v4). El `LEEME.txt` solo
> menciona ejecutar v5, lo que es insuficiente para un proyecto nuevo. Si vas a montar el
> backend desde cero y no tienes v3/v4, tendrás que recuperarlos o recrear a mano en el
> dashboard las tablas, columnas y políticas descritas abajo antes de ejecutar v5.

### 3. Verificar las políticas RLS en el dashboard (Table Editor → cada tabla → RLS)

Como la anon key es pública, **toda la seguridad depende de las políticas RLS**. Verifica en
Supabase, tras ejecutar los scripts, que se cumple exactamente esto:

- **Tabla `leads`** — **NO** debe ser legible por el rol `anon`. El formulario público solo
  necesita **insertar** (POST desde `app.js` con `Prefer: return=minimal`); leerla es
  exclusivo de los administradores autenticados (el panel `clientes.html` lee con sesión
  Auth). Si `anon` pudiera hacer `SELECT`, cualquiera podría descargar los datos de contacto
  de todos los clientes.
- **Tabla `products`** — debe ser **legible** por `anon` (el catálogo público la lee por
  REST) pero **NO escribible** por `anon`. Las operaciones de escritura (`insert`/`update`/
  `delete`/`upsert` desde `admin.js`) solo deben permitirse a usuarios **autenticados**. Si
  `anon` pudiera escribir, cualquiera podría alterar precios y fichas.
- **Registro público de Auth** — debe estar **DESACTIVADO** (Authentication → Providers →
  Email → «Allow new users to sign up» = OFF, o «Disable sign up»). Los paneles usan
  `signInWithPassword` contra usuarios creados a mano en Authentication → Users. Si el
  registro público estuviera abierto, cualquiera podría crearse una cuenta y, al quedar
  autenticado, obtener los permisos de escritura de `products` y de lectura de `leads`.
- **Bucket `productos` (Storage)** — lectura pública, escritura solo autenticados. Lo deja
  así `setup-supabase-v5.sql`; verifícalo en Storage → Policies.

### 4. Crear el usuario administrador

En Authentication → Users, crea a mano el usuario (email + contraseña) con el que entrarán
los paneles `admin.html` y `clientes.html`. Ambos paneles comparten sesión en el navegador.

## Tablas y columnas que consume el código

Referencia de lo que el front espera encontrar (verificado contra `prices.js`, `catalog.js`,
`admin.js`, `app.js` y `clientes.js`):

### `products`

| Columna       | Tipo                | Uso |
|---------------|---------------------|-----|
| `slug`        | text (único)        | Identificador; clave de conflicto en el `upsert` del panel |
| `name`        | text                | Nombre del producto |
| `brand`       | text                | Marca |
| `category`    | text                | `calderas`, `aires` o `termos` |
| `price`       | numérico            | Precio con IVA (validado 1–99.999) |
| `specs`       | **array de texto**  | Etiquetas cortas bajo el nombre |
| `features`    | **array de texto**  | Lista de características |
| `description` | text                | Descripción |
| `ideal_for`   | text                | «Pensado para» (la calculadora lee de aquí m² y baños) |
| `efficiency`  | text                | Clase energética (ej. `A+++`) |
| `img`         | text                | URL de la foto (la añade v5) |
| `pop`         | numérico            | Orden de popularidad (1 = más vendido) |
| `best`        | booleano            | Insignia «Más vendido» |
| `visible`     | booleano            | Si `false`, se oculta en la web pública |

`specs` y `features` **deben ser arrays** en la base de datos: `admin.js` y `prices.js`
comprueban `Array.isArray(...)` y, si no lo son, los tratan como lista vacía.

### `leads`

| Columna      | Tipo   | Uso |
|--------------|--------|-----|
| `id`         | —      | Identificador (lo usa `clientes.js` para borrar) |
| `created_at` | fecha  | Fecha de la solicitud (orden descendente en el panel) |
| `name`       | text   | Nombre |
| `phone`      | text   | Teléfono |
| `email`      | text   | Email |
| `interest`   | text   | Qué busca (caldera/aire/…); el panel lo agrupa por interés |
| `message`    | text   | Mensaje |

El POST público desde `app.js` envía exactamente `name`, `phone`, `email`, `interest` y
`message`; `id` y `created_at` los pone la base de datos.

