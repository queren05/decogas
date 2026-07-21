# Plan de lanzamiento — decogas.es

Hoja de ruta para publicar la web nueva en **decogas.es** (en paralelo a la
vieja decogas.com) y dejar todo bajo el correo **info@decogas.com**.
Ritmo: con calma, bien hecho. Sin prisa.

Leyenda: 👤 = lo hace el usuario · 🤖 = lo hago yo (Claude) · ⏳ = pendiente

---

## FASE 0 — Migración de cuentas a info@decogas.com

### GitHub (transferir el repo)
- [x] 🤖 Transferencia `queren05/decogas` → `decogas` **iniciada** (queda pendiente de aceptar).
- [ ] 👤 Aceptar la transferencia desde la cuenta **decogas**:
  - Correo a info@decogas.com de GitHub → botón **Accept transfer**, o
  - github.com/decogas/decogas con sesión de `decogas` → aceptar.
- [ ] 👤 Añadir a **queren05** como colaborador (repo → Settings → Collaborators → Write) para que yo siga desplegando.
- [ ] 🤖 Aceptar la invitación de colaborador y verificar acceso + que **Pages** sigue activo.
- [ ] 🤖 Actualizar referencias de código de `queren05` → cuenta nueva donde haga falta.

> La web pasará a `decogas.github.io/decogas` (base `/decogas/` sigue válida) hasta apuntar el dominio.

### Supabase (mantener el proyecto actual, solo cambiar propiedad)
- [ ] 👤 En el proyecto que YA funciona → Organization → Team → **Invite** info@decogas.com como **Owner**.
- [ ] 👤 **Borrar el proyecto nuevo vacío** (para no confundir).
- [ ] 👤 (Opcional) Authentication → Users → cambiar el email del admin a info@decogas.com.
- [ ] 🤖 `config.js`: `notifyEmail` → info@decogas.com (⚠️ formsubmit.co pedirá confirmar ese correo la 1ª vez).

> La URL y la anon key NO cambian → la web sigue funcionando sin tocar nada más.

---

## FASE 1 — Seguridad (urgente, 5 min) 👤
- [ ] Authentication → Providers → Email → **quitar "Allow new users to sign up"**.
- [ ] Authentication → Users → **cambiar la contraseña** del admin (larga y aleatoria).
- [ ] SQL Editor → ejecutar **`supabase/setup-supabase-v8-analitica.sql`** (poner tu email en `CORREO_DEL_ADMIN`). Enciende la analítica del panel.
- [ ] ⏳ (Defensa extra, juntos) Acotar por email admin las políticas de `leads` y `products` (revisar nombres actuales en el dashboard antes de tocar).

---

## FASE 2 — Preparar el sitio para decogas.es 🤖
(Se hará en una rama para no romper la web actual hasta el corte.)
- [ ] Workflow `pages.yml`: build con `SITE=https://decogas.es` y `BASE=/`.
- [ ] Crear `web/public/CNAME` con `decogas.es`.
- [ ] Blog: 378 enlaces internos `/decogas/...` → `/...` (143 artículos).
- [ ] Sitemap ↔ canonical: unificar URLs (quitar `/index`, coherencia `.html`).
- [ ] QA final con agentes en paralelo antes del corte.

### Decisión de negocio pendiente 👤 (importante para GANAR el duelo)
- **Contenido duplicado**: decogas.es y decogas.com serían casi iguales → Google
  puede filtrar el nuevo como duplicado. Opciones:
  1. El duelo va por **Google Ads a landings** (recomendado); el blog orgánico se
     queda solo en un dominio.
  2. Reescribir/diferenciar el contenido de decogas.es.
  3. Plan de redirección 301 decogas.com → decogas.es cuando gane.

---

## FASE 3 — Cortar el dominio 👤 (con mis pasos exactos)
- [ ] Dato que necesito: **¿dónde está registrado decogas.es?** (¿Nicalia?).
- [ ] Apuntar el DNS de decogas.es a GitHub Pages (registros A + verificación del dominio).
- [ ] 🤖 Verificar HTTPS y que todo carga en decogas.es.

---

## FASE 4 — Fotos del blog (antes de apagar decogas.com) ⏳
- [ ] 👤 Conseguir el ZIP de `wp-content/uploads` (la web vieja estaba caída; reintentar).
- [ ] 🤖 Optimizar (WebP) y self-hostear las 378 imágenes en `web/public/blog-img/` + reescribir los `.md`.

> Sin esto, si se apaga decogas.com el blog de decogas.es se queda sin imágenes.

---

## FASE 5 — Google Ads nuevo (en unos días) 🤖 estrategia · 👤 manos en el panel
- [ ] Montar campañas optimizando a **conversiones REALES** (llamadas, formulario, WhatsApp), NO a "Contactos" basura como la cuenta vieja.
- [ ] GA4 + seguimiento de conversiones en la web (cablearlo cuando haya IDs).
- [ ] Terminar la auditoría de la cuenta vieja (faltan 2 capturas: términos de búsqueda por coste + config de la acción "Contactos").

---

## Estado actual (21/07/2026)
- ✅ Analítica propia montada y desplegada (falta ejecutar el SQL v8).
- ✅ SEO local (LocalBusiness), og:image, sitemap limpio, marca del PDF → decogas.es.
- ✅ Auditoría de Google Ads hecha (dinero mal invertido en la cuenta vieja).
- ✅ Transferencia de GitHub iniciada (pendiente de aceptar).
- ⏳ Todo lo demás, según las fases de arriba.
