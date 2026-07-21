-- ============================================================
-- v8 — Analítica propia de la web (tráfico, llamadas, WhatsApp)
-- ------------------------------------------------------------
-- Sistema de medición first-party alojado en TU Supabase, para
-- pintarlo en el panel de control. No usa Google Analytics.
--
-- CÓMO EJECUTARLO:
--   Supabase → SQL Editor → New query → pega TODO esto → Run.
--   (Igual que hiciste con el v6 y el v7.)
-- ============================================================

create table if not exists public.web_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('pageview','call','whatsapp','lead')),
  path        text,          -- ruta de la página (/calderas.html, ...)
  referrer    text,          -- de dónde viene el visitante
  source      text,          -- google / directo / facebook / ...
  session     text,          -- id anónimo de sesión (contar visitantes)
  device      text           -- 'movil' | 'escritorio'
);

-- Índices para que el panel consulte rápido
create index if not exists web_events_created_idx on public.web_events (created_at desc);
create index if not exists web_events_type_idx    on public.web_events (type);

-- ---------- Seguridad (RLS) ----------
alter table public.web_events enable row level security;

-- La web es pública: cualquiera puede REGISTRAR un evento (como los leads),
-- pero nadie anónimo puede LEERLOS. Solo el admin autenticado los ve.
drop policy if exists "anon inserta eventos"  on public.web_events;
drop policy if exists "solo admin lee eventos" on public.web_events;

create policy "anon inserta eventos" on public.web_events
  for insert to anon, authenticated
  with check (true);

create policy "solo admin lee eventos" on public.web_events
  for select to authenticated
  using (true);

-- Listo. En cuanto la web nueva reciba visitas, el panel las mostrará.
