-- ============================================================
-- v8 — Analítica propia de la web (tráfico, llamadas, WhatsApp)
-- ------------------------------------------------------------
-- Sistema de medición first-party alojado en TU Supabase, para
-- pintarlo en el panel de control. No usa Google Analytics.
--
-- ⚠️ ANTES DE EJECUTAR: sustituye CORREO_DEL_ADMIN (línea de la
--    política de lectura) por el email con el que inicias sesión
--    en el panel. Así solo tú puedes leer la analítica.
--
-- CÓMO EJECUTARLO:
--   Supabase → SQL Editor → New query → pega TODO esto → Run.
--   (Igual que hiciste con el v6 y el v7.)
-- ============================================================

create table if not exists public.web_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('pageview','call','whatsapp','lead')),
  -- Límites de longitud EN LA BASE (no solo en el cliente): evitan que
  -- alguien haga POST directo con textos gigantes e hinche el almacenamiento.
  path        text check (path     is null or length(path)     <= 200),
  referrer    text check (referrer is null or length(referrer) <= 300),
  source      text check (source   is null or length(source)   <= 120),
  session     text check (session  is null or length(session)  <= 64),
  device      text check (device   is null or device in ('movil','escritorio'))
);

-- Índices para que el panel consulte rápido
create index if not exists web_events_created_idx on public.web_events (created_at desc);
create index if not exists web_events_type_idx    on public.web_events (type);

-- ---------- Seguridad (RLS) ----------
alter table public.web_events enable row level security;

drop policy if exists "anon inserta eventos"  on public.web_events;
drop policy if exists "solo admin lee eventos" on public.web_events;

-- La web es pública: cualquiera puede REGISTRAR un evento (como los leads)…
create policy "anon inserta eventos" on public.web_events
  for insert to anon, authenticated
  with check (true);

-- …pero SOLO el admin (por su email en el token) puede LEERLOS.
-- Defensa en profundidad: aunque se reactivara el registro público,
-- ningún usuario que no seas tú podría ver la analítica.
create policy "solo admin lee eventos" on public.web_events
  for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN' );

-- Listo. En cuanto la web nueva reciba visitas, el panel las mostrará.
