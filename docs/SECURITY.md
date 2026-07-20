# Seguridad — Decogas

Revisión de seguridad del sitio (auditoría 20/07/2026). El sitio es **estático** (HTML+JS
servido desde GitHub Pages) con **Supabase** como único backend, así que la superficie de
ataque es pequeña: no hay servidor propio que comprometer. La seguridad real vive en las
**políticas RLS de Supabase** y en la cuenta.

## Estado actual (verificado)

- **Sin secretos en el repositorio.** `config.js` solo contiene la `anonKey` de Supabase,
  que es **pública por diseño** (viaja al navegador; la seguridad la imponen las RLS, no el
  secreto de la clave). No hay service-role key, contraseñas ni claves privadas en el código.
- **XSS: escapado consistente.** Todo dato que viene de Supabase o del usuario y se inserta
  en el DOM pasa por `DecogasUtil.esc()` (catálogo, calculadora, panel de clientes). Los usos
  de `innerHTML` restantes son sobre datos calculados/estáticos o el propio input del usuario.
- **RLS verificadas en producción**: `leads` NO es legible por el rol anónimo; `products` NO
  es escribible por anónimo (solo `authenticated`). El bucket `productos` es de lectura pública.
- **Paneles privados** (`admin.html`, `clientes.html`): `noindex, nofollow` para no indexarse.
- **Cabeceras de seguridad** listas en `web/public/_headers` (CSP, HSTS, X-Frame-Options,
  Referrer-Policy, etc.) — **GitHub Pages NO las aplica**; se activarán al mover el sitio a
  **Cloudflare Pages** (ver `DEPLOY.md`). La CSP usa `script-src 'self' 'unsafe-inline'`
  (necesario por los scripts inline de Astro; el SDK de Supabase está auto-alojado en `/vendor`).
- **Dependencias**: `esbuild` tiene una vulnerabilidad conocida, pero es una herramienta de
  **build (dev)**; NO se envía al navegador ni afecta al sitio estático publicado. Arreglarla
  obliga a subir Astro a una versión mayor con rupturas, por eso no se aplica: riesgo real nulo
  en producción.

## PENDIENTE — acciones del titular (críticas, no las puede hacer el asistente)

1. **Cambiar la contraseña del admin** (ahora es `admin`). Supabase → Authentication → Users.
   Es el punto más débil de todo: da igual el resto si la puerta tiene esa llave.
2. **Desactivar el registro público**: Authentication → Providers → Email → sign up OFF.
   Si está abierto, cualquiera se crea cuenta y hereda permisos de escritura de `products`.
3. **Ejecutar los SQL de endurecimiento** en Supabase → SQL Editor (son DDL, solo se pueden
   correr desde el panel): `supabase/setup-supabase-v6-seguridad.sql` (Storage restringido al
   email admin) y `supabase/setup-supabase-v7-estados.sql` (columna estado del panel).
4. **Mover a Cloudflare Pages** para activar las cabeceras de seguridad y las redirecciones 301
   (paso previo a decogas.com).
5. **2FA** en la cuenta de Supabase, en GitHub y en el registrador del dominio. Activar **DNSSEC**
   y un registro **CAA** cuando decogas.com esté en marcha: robar el dominio ES robar la web.
6. **Copia de seguridad periódica** de la base de datos: `node scripts/backup-supabase.mjs`
   (products con la anon key; leads requieren `SUPABASE_SERVICE_KEY`).
