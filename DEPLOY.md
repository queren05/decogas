# Despliegue — Decogas

Guía para publicar la web en producción (**GitHub Pages**) y configurar el backend
(**Supabase**). Todas las rutas del repo llevan espacios y paréntesis; cítalas siempre entre
comillas.

- **Repositorio:** `github.com/queren05/decogas` (privado). El `gh` CLI está autenticado en
  el PC del equipo.
- **URL de producción:** `https://queren05.github.io/decogas/` (el sitio se sirve bajo la
  subruta `/decogas/`).
- **Carpeta que se publica:** `"decogas-web (2)\decogas-web"` (no el nivel superior: los
  `.sql`, el `LEEME.txt` y los tests de `"decogas-web (2)"` no forman parte del sitio).

## Publicar: push a `main` → GitHub Actions → Pages

El despliegue es **automático y continuo**. No hay build ni pasos manuales:

1. Haz `push` (o merge) a la rama **`main`**.
2. El workflow `.github/workflows/pages.yml` se dispara, sube como artefacto la carpeta
   `"decogas-web (2)/decogas-web"` y la publica en GitHub Pages con las acciones oficiales
   (`configure-pages` → `upload-pages-artifact` → `deploy-pages`).
3. En un par de minutos el sitio queda actualizado en `https://queren05.github.io/decogas/`.
   Recarga con `Ctrl + Shift + R` para saltarte la caché del navegador.

También puedes lanzarlo a mano desde la pestaña **Actions → Desplegar en GitHub Pages →
Run workflow** (el workflow declara `workflow_dispatch`).

`config.js` viaja tal cual al navegador: la URL y la anon key de Supabase quedan en el sitio
publicado (es lo esperado; ver la sección de seguridad).

> **`netlify.toml` es un vestigio.** El sitio estuvo alojado en Netlify; ese archivo y el
> `LEEME.txt` (que describe el flujo de arrastrar la carpeta a `app.netlify.com/drop`)
> **ya no se usan**. El único despliegue vigente es el de GitHub Pages descrito arriba.

## URLs absolutas y subruta `/decogas/`

Como GitHub Pages sirve el sitio bajo `/decogas/`, todo lo que apunta a una URL absoluta
lleva ese prefijo. Verificado en el código:

- `robots.txt` → `Sitemap: https://queren05.github.io/decogas/sitemap.xml`.
- `sitemap.xml` → todas las `<loc>` empiezan por `https://queren05.github.io/decogas/`.
- `index.html` → `canonical` y `og:url` = `https://queren05.github.io/decogas/`.

Si algún día cambia el nombre del repo o se usa dominio propio, hay que actualizar estos tres
sitios (robots, sitemap y las etiquetas `canonical`/`og:url` de las páginas).

## Cabeceras de seguridad: el archivo `_headers` YA NO se aplica

El archivo `"decogas-web (2)\decogas-web\_headers"` está en formato **Netlify**.
**GitHub Pages no soporta cabeceras HTTP personalizadas**, por lo que ese archivo se publica
como un fichero estático inerte y **ninguna de sus cabeceras está activa** en producción.

Esto significa que, actualmente, el sitio **NO** emite las cabeceras de seguridad que definía
para Netlify (regresión conocida respecto al hosting anterior):

- `Content-Security-Policy` (limitaba `script-src`/`connect-src`/`style-src`/`img-src`…).
- `X-Frame-Options: DENY` y `frame-ancestors 'none'` (anti-clickjacking).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Las reglas de caché de `styles.css`, `hero-bg.jpg` y `favicon.svg`.

Para recuperarlas habría que ponerlas por delante con un proveedor que sí soporte cabeceras
(por ejemplo Cloudflare delante de Pages, o volver a un hosting como Netlify). Mientras tanto,
la única barrera de seguridad real del backend siguen siendo las **políticas RLS de Supabase**
(ver más abajo), que no dependen de estas cabeceras.

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
- **`setup-supabase-v5.sql`** — en el repo, en `"decogas-web (2)"`. Añade la columna `img` a
  `products` y crea el bucket público de Storage `productos` con sus permisos (lectura
  pública; subida/actualización/borrado solo para usuarios autenticados). Referenciado en
  `admin.js:402`.
- **`setup-supabase-v6-seguridad.sql`** — en el repo, en `"decogas-web (2)"`. Endurece las
  políticas (RLS/Storage). **Ojo:** este script usa un marcador `CORREO_DEL_ADMIN` que hay que
  sustituir por el email real del administrador antes de ejecutarlo. Si se ejecuta sin
  sustituir, deja el bucket sin nadie que pueda escribir (ver el arreglo siguiente).
- **`import-antigua/arreglo-storage-admin.sql`** — corrige el caso anterior: recrea las tres
  políticas de escritura del bucket `productos` (`insert`/`update`/`delete`) restringidas al
  **email real del administrador** mediante `auth.jwt() ->> 'email'`. La lectura pública del
  bucket no se toca. Ejecútalo si tras el `v6` nadie (ni el admin) puede subir/cambiar/borrar
  fotos.

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
- **Bucket `productos` (Storage)** — lectura pública; la **escritura** está restringida al
  **email del administrador**, no a cualquier usuario autenticado. `setup-supabase-v5.sql` deja
  escritura para todo `authenticated`, y `setup-supabase-v6-seguridad.sql` /
  `import-antigua/arreglo-storage-admin.sql` la endurecen a un único email (comprobando
  `auth.jwt() ->> 'email'`). Verifícalo en Storage → Policies: solo el email del admin debe
  poder `insert`/`update`/`delete`.

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

