# Plan de migración a Astro — Web Decogas

> **✅ MIGRACIÓN COMPLETADA el 19/07/2026.** Este documento es el plan histórico:
> las fases 1–3 se ejecutaron (la F4 de optimizaciones queda opcional), las
> 187 URLs se verificaron en vivo tras el corte y la carpeta antigua
> `"decogas-web (2)"` se eliminó del repo. Las rutas que se mencionan abajo
> reflejan el estado del repo en el momento de escribirlo; la estructura vigente
> está en `ARCHITECTURE.md` §3 y en el `README.md`.

Complementa a `ARCHITECTURE.md` (arquitectura actual). Fecha: 18/07/2026.

> **Contexto de hosting (actualizado 18/07/2026):** la web ya **no se despliega en
> Netlify** sino en **GitHub Pages** bajo la subruta
> `https://queren05.github.io/decogas/`. El deploy real es el workflow
> `.github/workflows/pages.yml` (push a `main`), hay un `.nojekyll`, y **todas las
> rutas absolutas de los HTML llevan el prefijo `/decogas/`** (7145 reescrituras);
> los `canonical`, el `sitemap.xml` y el `robots.txt` apuntan ya a
> `queren05.github.io/decogas`. Esto condiciona toda la migración: el proyecto Astro
> debe construirse con `base: '/decogas'` y **GitHub Pages no soporta el archivo
> `_headers`** (se pierden las cabeceras de seguridad — ver §5-bis).

## 1. Objetivo

Resolver los tres dolores reales de la web actual sin tocar lo que funciona:

| Problema hoy | Solución con Astro |
|---|---|
| Header/menú/footer duplicados en **187 HTML** — un cambio = tocar 187 archivos (y ya se ha sufrido: las 7145 reescrituras del prefijo `/decogas/` son exactamente este dolor) | Un layout `.astro` compartido; se escribe una vez |
| Blog: ~177 artículos en HTML crudo — escribir uno nuevo es un suplicio | Artículos en **Markdown** con frontmatter; Astro genera el HTML |
| Cache-busting `?v=N` a mano (hoy en `?v=21`) y sitemap a mano | El build los gestiona (sitemap con `@astrojs/sitemap`) |

**Recuento real verificado hoy:** blog = 177 artículos (`caldera` 107, `aire-acondicionado` 50, `aerotermia` 19, `blog` 1) + 10 páginas raíz (index, calderas, aires, termos, calcula, guias, legal, clientes, admin, 404) = 187 HTML.

**Qué NO se toca:** los `.js` de lógica (`utils`, `config`, `prices`, `catalog`, `app`, `calcula`, `search`, `guias`, `admin`, `clientes`, `data-*.js`, con todos sus fixes), Supabase, el diseño visual (`styles.css` tal cual), la suite de 36 tests (solo se adaptan rutas del harness). Los scripts se sirven como archivos clásicos desde `public/` — **cero reescritura de JavaScript**.

## 2. Estructura destino (y aplanado de carpetas)

La migración es el momento de ejecutar la "Fase 0" pendiente de `ARCHITECTURE.md`: eliminar la doble anidación `decogas-web (2)/decogas-web`. El proyecto Astro vive en **`web/`** en la raíz del repo (nombre corto, sin espacios ni paréntesis — se acabaron las rutas que hay que citar):

```
decogas/
├── web/                              ← proyecto Astro (nuevo)
│   ├── astro.config.mjs              ← site + base:'/decogas' + build.format:'file' + integración sitemap
│   ├── package.json                  ← astro, @astrojs/sitemap, (dev) turndown, jsdom
│   ├── src/
│   │   ├── layouts/Base.astro        ← <head>, header, menú, footer (UNA vez)
│   │   ├── layouts/Articulo.astro    ← layout de artículo de blog (hero + <article class="article-prose">)
│   │   ├── pages/                    ← index, calderas, aires, termos, calcula,
│   │   │   │                            guias, legal, clientes, admin, 404 (.astro)
│   │   │   └── blog/[...slug].astro  ← ruta dinámica de los ~177 artículos
│   │   └── content/
│   │       ├── config.ts             ← esquema (Zod) de la colección `blog`
│   │       └── blog/                 ← ~177 artículos .md/.mdx (colección)
│   ├── public/                       ← styles.css, TODOS los .js, robots.txt,
│   │   │                                favicon.svg, hero-bg.jpg, .nojekyll
│   │   │                                (y _headers como vestigio — ver §5-bis)
│   └── scripts/html2md.mjs           ← conversor HTML→MD (uso único, dev)
├── tests/                            ← la suite actual, movida a la raíz, rutas adaptadas (ver §5)
├── .github/workflows/pages.yml       ← deploy: build de Astro + publish web/dist (ver §5-bis)
├── decogas-web (2)/                  ← se MANTIENE intacto hasta el corte final; luego se borra
├── import-antigua/                   ← FUERA de la migración (rescate del catálogo viejo)
├── ARCHITECTURE.md · DEPLOY.md · README.md
└── netlify.toml                      ← vestigio: se ELIMINA en el corte (ya no se usa Netlify)
```

**Decisión sobre dónde vive el proyecto:** `web/` en la raíz, no en la ubicación anidada actual. El workflow de Pages pasará a construir `web/` y publicar `web/dist` (ver §5-bis). La carpeta `decogas-web (2)/` no se toca durante el desarrollo para que **producción siga sirviéndose del sitio actual** hasta el merge final.

## 3. URLs idénticas (crítico para el SEO) y la `base` de GitHub Pages

Las URL actuales son de dos formas y **deben quedar exactamente iguales**, incluido el prefijo `/decogas/` y el trailing slash del blog (el blog trae el posicionamiento heredado del WordPress; cambiar una sola URL es perder ranking):

- Páginas raíz: `/decogas/calderas.html`, `/decogas/index.html`… 
- Blog: `/decogas/blog/caldera/<slug>/` (carpeta con `index.html`, con barra final).

**Cómo se consigue en `astro.config.mjs`:**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://queren05.github.io',   // dominio SIN la subruta
  base: '/decogas',                     // subruta de GitHub Pages
  output: 'static',
  build: { format: 'file' },            // ← clave para conservar las URLs
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
```

- Con `build.format: 'file'`, una página `src/pages/calderas.astro` genera `calderas.html` (no `calderas/index.html`). Con `base: '/decogas'` queda servida en `/decogas/calderas.html`. **Idéntica.**
- Para el blog se aprovecha el mismo `format: 'file'`: en `getStaticPaths()` el `slug` de cada artículo termina en `/index` (p. ej. `blog/caldera/a-cuantos-bares.../index`), de modo que el archivo emitido es `blog/caldera/<slug>/index.html` → URL `/decogas/blog/caldera/<slug>/` con su barra final. **Idéntica.**
  - (Corrige el borrador previo, que citaba `format: 'preserve'`: el modo correcto y bien soportado para este mapeo es `'file'` con el sufijo `/index` en el slug.)
- **`base` en los enlaces del layout:** los `<a>`, `<link>` y `<script src>` del `Base.astro` deben respetar la base. Se usa `import.meta.env.BASE_URL` (que vale `/decogas/`) en el layout, en vez de hardcodear `/decogas/`. Así el día que se mueva a `decogas.com` (raíz, sin subruta) basta cambiar `base` en una línea. En el **cuerpo pegado** de cada página, los prefijos `/decogas/` ya presentes pueden quedarse tal cual de momento; conviene normalizarlos a `BASE_URL` en la Fase 4.
  - **Ojo con los `.js`:** `app.js` contiene rutas absolutas hardcodeadas (`/decogas/clientes.html`). Eso NO se toca en esta migración (regla de "no reescribir JS"), pero queda anotado como acople a la base: si algún día cambia la subruta, ese literal hay que actualizarlo a mano en el JS.

**Verificación obligatoria:** script que liste los 187 HTML del sitio actual y los compare 1:1 con `web/dist/` — **cero URLs perdidas, cero URLs nuevas inesperadas** antes de cualquier merge a `main`. Comparar rutas *con* el prefijo `/decogas/`.

## 4. Conversión del blog a Markdown

Script Node único (`web/scripts/html2md.mjs`, se ejecuta una vez):

1. Recorre `decogas-web (2)/decogas-web/blog/**/index.html`, parsea con `jsdom` y extrae **solo** el contenido del artículo: el `<article class="article-prose"> <div class="wrap"> … </div>` (verificado en el HTML real), descartando `<header id="siteHeader">`, `<nav>`, `<footer>` y el bloque `<section class="article-hero">` (breadcrumb + tag + h1 + meta) que reconstruirá el layout de artículo.
2. Convierte ese fragmento HTML→Markdown con **`turndown`** (dependencia solo de desarrollo). Las imágenes del cuerpo apuntan a URLs absolutas de `decogas.com/wp-content/...` (WordPress viejo) — se dejan tal cual: son enlaces externos que ya funcionan.
3. **Frontmatter** por artículo:
   - `title`: del `<h1>` del `article-hero` (equivale al `<title>` sin el sufijo `· Decogas Madrid`).
   - `description`: del `<meta name="description">`.
   - `category`: la carpeta contenedora → `caldera` | `aire-acondicionado` | `aerotermia` | `blog`.
   - `slug`: **la ruta original completa** (`caldera/a-cuantos-bares.../`) para garantizar URL idéntica; el `getStaticPaths` la usa con el sufijo `/index` (§3).
   - `readingTime`: el HTML trae "N min de lectura" en `.article-meta`; se puede rescatar, pero es prescindible.
   - `date`: **corrección importante al borrador** — los artículos **no llevan fecha** en el HTML (no hay `<time>` ni `datePublished`), y el `sitemap.xml` **no tiene `<lastmod>`**. Por tanto `date` **no es derivable** y **no debe inventarse** (una fecha falsa confunde a buscadores y usuarios). Se deja el campo **opcional** en el esquema; se rellena solo si en el futuro se recupera del WordPress original. El orden del blog se mantiene por categoría/título como hoy, no por fecha.
4. **Esquema de la colección** (`src/content/config.ts`) con Zod: `title` y `category` obligatorios; `description`, `slug`, `readingTime`, `date` opcionales.
5. **Revisión por muestreo:** ~10 artículos (al menos 2 de cada categoría) comparados en el navegador viejo vs nuevo antes de dar por buena la conversión en lote. Los que salgan mal (tablas raras, HTML incrustado) se dejan como `.mdx` o con el HTML pegado dentro del `.md` — la colección lo admite.

## 5. Piezas sueltas

- **`robots.txt`**: va a `web/public/` tal cual. Ya apunta a `https://queren05.github.io/decogas/sitemap.xml` y bloquea `/admin.html` y `/clientes.html` — se conserva.
- **Sitemap**: pasa a generarse con **`@astrojs/sitemap`**. Con `site: 'https://queren05.github.io'` + `base: '/decogas'`, la integración emite las `<loc>` como `https://queren05.github.io/decogas/...`, idénticas al `sitemap.xml` actual. Se **elimina** el `sitemap.xml` a mano. El día que se pase a `decogas.com` se cambian `site`/`base` y el sitemap se regenera solo.
- **404**: `src/pages/404.astro` → con `base` genera `web/dist/404.html`. **GitHub Pages sí usa `404.html`** del raíz del artefacto publicado (a diferencia de lo que decía el borrador, que hablaba de Netlify). Verificar que una URL inexistente bajo `/decogas/` sirve esta página.
- **`.nojekyll`**: imprescindible en el artefacto publicado (GitHub Pages sin él ignora carpetas que empiezan por `_`, p. ej. los assets internos de Astro `_astro/`). Se coloca en `web/public/.nojekyll` para que Astro lo copie a `dist/`.
- **Cache-busting `?v=N`**: los scripts de `public/` mantienen el `?v=21` manual de momento, pero centralizado en **una constante del layout** (cambiarlo pasa de 187 ediciones a 1 — el mismo dolor que motivó las 7145 reescrituras). Automatizarlo del todo (hashing de Astro) queda para la Fase 4, y solo aplica a assets que Astro procese, no a los `.js` clásicos de `public/`.
- **Tests**: el harness (`tests/harness.js`) lee los `.js` por ruta: `SRC = path.join(__dirname, "..", "decogas-web")`. Al mover la suite a `tests/` en la raíz y los scripts a `web/public/`, se actualiza esa única línea a `path.join(__dirname, "..", "web", "public")`. Los 36 asserts **no cambian**. `npm test` en verde es condición de merge de cada fase.

## 5-bis. Cabeceras de seguridad: qué se pierde con GitHub Pages

GitHub Pages **no soporta `_headers`** (es un archivo propietario de Netlify) ni permite configurar cabeceras HTTP de respuesta. El sitio actual servía por `_headers` una CSP y varias cabeceras de seguridad; en Pages **se pierden todas**. Hay que documentarlo con precisión y decidir la compensación:

| Cabecera actual (`_headers`) | ¿Compensable en GitHub Pages? |
|---|---|
| `Content-Security-Policy` | **Parcial** vía `<meta http-equiv="Content-Security-Policy">` en `Base.astro`. Cubre lo relevante para XSS (`script-src`, `connect-src` a Supabase/FormSubmit, `img-src`, `style-src`). **Limitación del meta:** `frame-ancestors` y `report-uri`/`report-to` se **ignoran** en `<meta>`; solo funcionan como cabecera real. |
| `X-Frame-Options` | **No** (no existe equivalente en `<meta>`). Se pierde la protección anti-clickjacking; parcialmente suplida por `frame-ancestors` de la CSP… que en `<meta>` tampoco aplica. **Se pierde.** |
| `X-Content-Type-Options: nosniff` | **No** vía meta. Se pierde. |
| `Referrer-Policy` | **Parcial**: `<meta name="referrer" content="...">` cubre el caso. |
| `Permissions-Policy` | **No** vía meta. Se pierde. |
| `Strict-Transport-Security` (HSTS) | **No** configurable; GitHub Pages ya fuerza HTTPS en `github.io`, pero sin HSTS propio. Se pierde el control. |
| Caché (`Cache-Control` por tipo) | **No** configurable en Pages; sirve con su caché por defecto. Se mitiga con el `?v=N`. |

**Recomendación:** poner en `Base.astro` un `<meta http-equiv="Content-Security-Policy">` con la CSP actual adaptada (mantener `connect-src` a Supabase y FormSubmit, `script-src` a jsDelivr solo donde carga el SDK) y un `<meta name="referrer">`. Aceptar como **coste conocido de GitHub Pages** la pérdida de `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy` y HSTS. **Recuperación futura:** si se vuelve a un hosting con cabeceras (Netlify) o al dominio `decogas.com` detrás de **Cloudflare**, restaurar todas las cabeceras vía _Transform Rules_ / _headers de Cloudflare (o el `_headers` de Netlify), que ya se conserva como vestigio en `public/` para ese día. Anotarlo en `DEPLOY.md`.

**`_headers` y `netlify.toml`:** el `_headers` se deja en `public/` como plantilla de referencia (inofensivo: Pages simplemente lo publica como archivo estático y nadie lo lee). El `netlify.toml` de la raíz **se elimina** en el corte final: ya no se despliega en Netlify y mantenerlo induce a error sobre cuál es el deploy real. (Alternativa: dejarlo si se planea usar Netlify como entorno de *preview* — ver §6.)

**Workflow de Pages tras el corte** (`.github/workflows/pages.yml`): hoy sube la carpeta estática tal cual. Pasa a construir Astro:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with: { node-version: 24, cache: npm, cache-dependency-path: web/package-lock.json }
  - run: npm ci
    working-directory: web
  - run: npm run build          # genera web/dist con base /decogas
    working-directory: web
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v3
    with: { path: web/dist }
  - id: deployment
    uses: actions/deploy-pages@v4
```

## 6. Plan por fases (la web nunca se rompe)

Todo se hace en una rama `astro`. **Aviso realista sobre previews:** a diferencia de Netlify, **GitHub Pages no genera deploy-previews por rama/PR**. La verificación de cada fase se hace **localmente** con `npm run build && npm run preview` sobre `web/dist`, más el **script de comparación 1:1 de las 187 URLs** (§3). Si se quiere un preview *desplegado* real antes del corte, la opción más barata es una cuenta/repo de Netlify apuntando a la rama `astro` (solo para preview, no para producción) o un segundo GitHub Pages en un branch `gh-pages-preview`. El corte a producción es el merge de `astro` a `main`, que dispara el workflow ya modificado.

- **Fase 1 — Esqueleto + páginas raíz** (el grueso del trabajo): scaffold de Astro en `web/` con `astro.config.mjs` (site + `base:'/decogas'` + `format:'file'` + sitemap), `public/` con todos los assets y scripts (incluido `.nojekyll`), `Base.astro` con el header/menú/footer extraídos del `index` actual (enlaces vía `BASE_URL`, CSP en `<meta>`, `?v=N` centralizado), y las 10 páginas raíz convertidas a `.astro` (su HTML se pega casi tal cual, quitando lo que ya pone el layout y respetando el orden de scripts `utils → config → prices → data-* → search/otros → app`). *Verificar en local:* las 10 páginas píxel-perfect, los 5 flujos JS funcionando (catálogo, calculadora, formulario/lead, admin login, clientes), consola sin errores de CSP, y las URLs `/decogas/*.html` idénticas.
- **Fase 2 — Blog** (el 90% del beneficio de contenido): `scripts/html2md.mjs`, `content/config.ts` (esquema), `content/blog/` con los 177 `.md`, `layouts/Articulo.astro` (reconstruye el `article-hero` + `article-prose`), ruta `blog/[...slug].astro`, y la **comparación 1:1 de las 177 URLs de blog**. Mecánica pero exige la revisión por muestreo de la conversión.
- **Fase 3 — Corte a producción**: modificar `.github/workflows/pages.yml` (build de Astro + publish `web/dist`), **eliminar `netlify.toml`**, merge a `main`, verificar `https://queren05.github.io/decogas/` en real (páginas, blog, scripts, 404, sitemap), y **en un commit aparte y revertible** borrar `decogas-web (2)/`. Adaptar la ruta del harness de tests y actualizar `README.md`/`DEPLOY.md`/`ARCHITECTURE.md`.
- **Fase 4 — Opcional, después**: normalizar los `/decogas/` del cuerpo a `BASE_URL`, optimización de imágenes de Astro, hashing automático de assets procesados (reduce el `?v=N`), y valorar mover los `data-*.js`/guías a colecciones. Nada de esto bloquea el corte.

**Esfuerzo relativo:** F1 ≈ la mitad del trabajo (plantillas + verificar 5 flujos JS con CSP en meta); F2 ≈ un tercio (casi todo lo hace el script, pero la revisión por muestreo es real); F3 ≈ una tarde (workflow + verificación en producción + limpieza); F4 ≈ cuando apetezca.

## 7. Riesgos y señales tempranas

| Riesgo | Señal temprana / mitigación |
|---|---|
| **URLs que cambian** (prefijo `/decogas/` o trailing slash) → pérdida de SEO | Script de comparación 1:1 viejo↔`web/dist/` en cada fase, ejecutado **antes de todo merge**. Comprobar `format:'file'` + sufijo `/index` en el blog |
| **`base` mal aplicada** → enlaces rotos (`/calderas.html` en vez de `/decogas/calderas.html`) | Navegación manual en el preview local; `grep` de rutas sin prefijo en `dist/`. Enlaces del layout vía `BASE_URL` |
| **CSP en `<meta>` bloquea Supabase/FormSubmit/jsDelivr** o deja pasar algo | Consola del navegador limpia en el build local; probar login admin (SDK jsDelivr) y envío de lead (connect-src) antes del corte |
| **Pérdida de cabeceras de seguridad** (X-Frame-Options, HSTS…) en GitHub Pages | Asumida y documentada (§5-bis). Señal de que importa: un intento de clickjacking/embebido; plan de recuperación = Cloudflare/Netlify |
| **Orden de carga de scripts roto** en el layout | El layout replica el orden actual (`utils → config → prices → data-* → search → app`). Prueba manual de los 5 flujos |
| **Conversión HTML→MD pierde formato** (tablas, listas, imágenes WP) | Muestreo de ~10 artículos antes del lote; los que fallen se dejan en `.mdx`/HTML dentro de la colección |
| **Fechas inventadas en el blog** | No hay fecha en el origen (§4): `date` opcional y vacío; **no fabricar**. Señal: PRs que añaden fechas "a ojo" |
| **Harness de tests con rutas rotas** | `npm test` en verde como condición de merge; única línea a tocar es `SRC` en `harness.js` |
| **Sin preview desplegado en Pages** → primer error se ve en producción | Verificación local exhaustiva (build+preview+diff de URLs); opcional un preview en Netlify/branch antes del corte |

## 8. Decisiones y descartes

- **Astro y no Next.js/SvelteKit**: la web es contenido estático + scripts clásicos; Next/SvelteKit imponen runtime, hidratación y reescribir el JS a componentes — coste alto, beneficio nulo aquí, y chocan con la regla de "no tocar los `.js`". **Eleventy** es la alternativa digna (SSG simple, también salida estática), pero Astro aporta colecciones de contenido **tipadas** (Zod), `@astrojs/sitemap` oficial con soporte de `base`, y optimización de imágenes sin plugins de terceros, con la misma simplicidad y salida 100% estática que encaja perfecto con GitHub Pages.
- **`build.format: 'file'` (no `'directory'` ni `'preserve'`)**: es lo que conserva `/calderas.html` en las raíces y, con el sufijo `/index` en el slug, `/blog/.../` en el blog. Cualquier otro modo cambiaría URLs y rompería SEO.
- **Features de Astro que NO se usan**: nada de islands/React/Vue, nada de SSR/adaptadores, nada de View Transitions, nada de `@astrojs/image` en Fase 1. Modo `output: 'static'` puro. La simplicidad actual es una feature; se conserva.
- **Los `.js` no se convierten a módulos** en esta migración: funcionan, están testeados y arreglados; se sirven como scripts clásicos desde `public/` sin bundling. Modernizarlos sería otra iniciativa con su propio plan.
- **GitHub Pages como hosting**: decisión ya tomada por el usuario. Trade-off aceptado: se pierden las cabeceras de seguridad de `_headers` (§5-bis) a cambio de deploy gratis integrado en GitHub. La CSP crítica se recupera vía `<meta>`; el resto queda pendiente de un futuro Cloudflare/decogas.com.
