-- ============================================================
-- MIGRACIÓN V5 — Ejecutar en Supabase → SQL Editor (una vez)
-- Añade la foto de producto y crea el almacén de imágenes:
--  · Columna "img" en la tabla de productos.
--  · Bucket público "productos": cualquiera puede VER las fotos
--    de la web, pero solo el administrador puede subirlas/borrarlas.
-- ============================================================

alter table public.products
  add column if not exists img text default '';

-- Bucket de imágenes (público para lectura)
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

-- Permisos del bucket
drop policy if exists "fotos publicas de productos" on storage.objects;
create policy "fotos publicas de productos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'productos');

drop policy if exists "solo admins suben fotos" on storage.objects;
create policy "solo admins suben fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos');

drop policy if exists "solo admins actualizan fotos" on storage.objects;
create policy "solo admins actualizan fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'productos');

drop policy if exists "solo admins borran fotos" on storage.objects;
create policy "solo admins borran fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos');

-- Verificación
select 'columna img creada' as estado, count(*) as productos from public.products;
