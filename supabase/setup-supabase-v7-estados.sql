-- ============================================================
-- setup-supabase-v7-estados.sql
-- Estados de las solicitudes (mini-CRM del panel de clientes):
-- añade la columna `estado` a `leads` y permite a los usuarios
-- autenticados (los paneles) actualizarla.
-- Ejecutar UNA vez en Supabase → SQL Editor. Es idempotente.
-- ============================================================

-- 1) Columna de estado con su valor por defecto
alter table public.leads
  add column if not exists estado text not null default 'pendiente';

-- Solo los cuatro valores que entiende el panel
alter table public.leads
  drop constraint if exists leads_estado_check;
alter table public.leads
  add constraint leads_estado_check
  check (estado in ('pendiente', 'llamado', 'presupuestado', 'cerrado'));

-- 2) Política de actualización para los paneles (autenticados).
--    El formulario público (anon) sigue SIN poder actualizar nada.
drop policy if exists "leads_update_authenticated" on public.leads;
create policy "leads_update_authenticated" on public.leads
  for update to authenticated
  using (true)
  with check (true);
