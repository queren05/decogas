# Plan de migración a Astro — Web Decogas

Complementa a `ARCHITECTURE.md` (arquitectura actual). Fecha: 18/07/2026.

## 1. Objetivo

Resolver los tres dolores reales de la web actual sin tocar lo que funciona:

| Problema hoy | Solución con Astro |
|---|---|
| Header/menú/footer duplicados en **187 HTML** — un cambio = tocar 187 archivos | Un layout `.astro` compartido; se escribe una vez |
| Blog: ~177 artículos en HTML crudo — escribir uno nuevo es un suplicio | Artículos en **Markdown** con frontmatter; Astro genera el HTML |
| Cache-busting `?v=N` a mano y sitemap a mano | El build los gestiona (sitemap con `@astrojs/sitemap`) |

**Qué NO se toca:** los `.js` de lógica (catalog, admin, prices, utils… con todos sus fixes), Supabase, el diseño visual (styles.css tal cual), la suite de 36 tests (solo se adaptan rutas del harness). Los scripts se sirven como archivos clásicos desde `public/` — **cero reescritura de JavaScript**.

## 2. Estructura destino (y aplanado de carpetas)

La migración es el momento de ejecutar la "Fase 0" pendiente de ARCHITECTURE.md: eliminar la anidación `decogas-web (2)/decogas-web`. El proyecto Astro vive en `web/` en la raíz del repo:

```
decogas/
├── web/                      ← proyecto Astro (nuevo)
│   ├── astro.config.mjs
│   ├── package.json
│   ├── src/
│   │   ├── layouts/Base.astro        ← head, header, menú, footer (UNA vez)
│   │   ├── pages/                    ← index, calderas, aires, termos, calcula,
│   │   │   │                            guias, legal, clientes, admin, 404
│   │   │   └── blog/[...slug].astro  ← ruta dinámica de los artículos
│   │   └── content/blog/             ← ~177 artículos .md (colección)
│   ├── public/                       ← styles.css, todos los .js, _headers,
│   │   │                                robots.txt, favicon.svg, hero-bg.jpg
│   └── tests/                        ← la suite actual, rutas adaptadas
├── decogas-web (2)/          ← se mantiene hasta el corte final, luego se borra
├── import-antigua/           ← fuera de la migración (rescate del catálogo)
└── netlify.toml              ← base "web", command "npm run build", publish "web/dist"
```

## 3. URLs idénticas (crítico para el SEO)

Las URL actuales son de dos formas y **deben quedar exactamente iguales** (el blog trae el posicionamiento del WordPress):

- Páginas raíz: `/calderas.html`, `/index.html`… → en `astro.config.mjs` se usa `build: { format: 'preserve' }`, con lo que `calderas.astro` genera `/calderas.html`. Idénticas, sin redirecciones.
- Blog: `/blog/caldera/<slug>/` (carpeta con index.html) → la ruta dinámica `blog/[...slug].astro` genera los paths con sufijo `/index`, produciendo `blog/caldera/<slug>/index.html`. Idénticas.

Verificación obligatoria: script que liste los 187 HTML del sitio viejo y los compare 1:1 con `dist/` — cero URLs perdidas, cero URLs nuevas inesperadas antes de desplegar.

## 4. Conversión del blog a Markdown

Script Node único (`web/scripts/html2md.mjs`, se ejecuta una vez):
1. Recorre `blog/**/index.html`, extrae el contenido del artículo (el `<main>`/`<article>`, descartando header/footer/nav duplicados).
2. Convierte HTML→Markdown con `turndown` (dependencia solo de desarrollo).
3. Frontmatter por artículo: `title` (del `<title>`/h1), `description` (meta description), `category` (carpeta: caldera | aire-acondicionado | aerotermia | blog), `slug` (ruta original completa para garantizar la URL), y `date` si el HTML la trae.
4. Revisión por muestreo: ~10 artículos comparados en el navegador (viejo vs nuevo) antes de dar por buena la conversión en lote.

## 5. Piezas sueltas

- **`_headers`**: va a `public/` tal cual (Netlify lo lee del publish dir). La CSP actual sigue válida: Astro en modo estático puro no inyecta JS propio.
- **`robots.txt` y sitemap**: robots a `public/`; el sitemap pasa a generarse con `@astrojs/sitemap` (se configura `site` con el dominio; el día que se mueva a decogas.com se cambia UNA línea y todo el sitemap se regenera).
- **404**: `src/pages/404.astro` (Netlify la usa automáticamente).
- **Cache-busting**: los scripts de `public/` mantienen el `?v=N` manual de momento (el layout lo centraliza en una constante: cambiarlo pasa de 187 ediciones a 1). Automatizarlo del todo queda para la fase opcional.
- **Tests**: el harness lee los `.js` por ruta — se actualizan las rutas a `web/public/*.js`. Los 36 asserts no cambian.

## 6. Plan por fases (la web nunca se rompe)

Todo se hace en una rama `astro`; Netlify genera **deploy previews** de la rama, así que cada fase se verifica en una URL de prueba real antes de tocar producción. El corte a producción es un merge a `main`.

- **Fase 1 — Esqueleto + páginas raíz** (el grueso del trabajo de plantillas): scaffold de Astro en `web/`, `public/` con todos los assets y scripts, `Base.astro` con el header/menú/footer extraídos del index actual, y las 10 páginas raíz convertidas a `.astro` (su HTML se pega casi tal cual, quitando lo que ya pone el layout). Verificar en el preview: las 10 páginas píxel-perfect y todos los flujos JS funcionando (catálogo, calculadora, formulario, admin).
- **Fase 2 — Blog** (el 90% del beneficio): script de conversión, colección de contenido, ruta dinámica, comparación 1:1 de las 187 URLs. Es mecánica pero hay que revisar la conversión por muestreo.
- **Fase 3 — Corte**: cambiar `netlify.toml` (base `web`, publish `web/dist`, command `npm run build`), merge a `main`, verificar producción, y borrar `decogas-web (2)` en un commit aparte (revertible). Adaptar rutas del harness de tests y actualizar README/DEPLOY/ARCHITECTURE.
- **Fase 4 (opcional, después)**: optimización de imágenes de Astro, hashing automático de assets (adiós `?v=N`), y valorar mover los `data-*.js` a colecciones.

Esfuerzo relativo: F1 es la mitad del trabajo; F2 un tercio (casi todo lo hace el script); F3 una tarde; F4 cuando apetezca.

## 7. Riesgos y señales tempranas

| Riesgo | Señal temprana / mitigación |
|---|---|
| URLs que cambian → pérdida de SEO | Script de comparación 1:1 viejo↔`dist/` en cada fase; se ejecuta antes de todo merge |
| Orden de carga de scripts roto en el layout | El layout replica el orden actual (utils → config → resto). Prueba manual de los 5 flujos en el preview |
| Conversión HTML→MD pierde formato (tablas, listas) | Muestreo de ~10 artículos antes del lote; los que salgan mal se dejan en HTML dentro de la colección (Astro lo permite) |
| CSP bloquea algo nuevo | Consola del navegador limpia en el deploy preview; la CSP no se relaja sin motivo |
| Harness de tests con rutas rotas | `npm test` en verde es condición de merge de cada fase |

## 8. Decisiones y descartes

- **Astro y no Next.js/SvelteKit**: la web es contenido estático + scripts clásicos; Next/SvelteKit imponen runtime, hidratación y reescribir el JS a componentes — coste alto, beneficio nulo aquí. **Eleventy** sería la alternativa digna (también SSG simple), pero Astro da colecciones de contenido tipadas, sitemap oficial y optimización de imágenes sin plugins de terceros, con la misma simplicidad.
- **Features de Astro que NO se usan**: nada de islands/React/Vue, nada de SSR/adaptadores, nada de view transitions. Modo `output: 'static'` puro. La simplicidad actual es una feature; se conserva.
- **Los `.js` no se convierten a módulos** en esta migración: funcionan, están testeados y arreglados. Modernizarlos sería otra iniciativa con su propio plan (y sin mezclarla con esta).
