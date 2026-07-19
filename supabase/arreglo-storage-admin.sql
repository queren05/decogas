-- ============================================================
-- ARREGLO: políticas del bucket 'productos' con el email real
-- ------------------------------------------------------------
-- El setup-supabase-v6-seguridad.sql se ejecutó con el marcador
-- CORREO_DEL_ADMIN sin sustituir, así que ahora NADIE (ni el
-- admin) puede subir/cambiar/borrar fotos. Este script recrea
-- las tres políticas de escritura con el email real del admin.
-- La lectura pública del bucket no se toca.
--
-- CÓMO: Supabase → SQL Editor → pegar TODO → Run.
-- ============================================================

drop policy if exists "solo admins suben fotos" on storage.objects;
drop policy if exists "solo admins actualizan fotos" on storage.objects;
drop policy if exists "solo admins borran fotos" on storage.objects;

create policy "solo admins suben fotos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'productos'
    and (auth.jwt() ->> 'email') = 'dr4389742@gmail.com'
  );

create policy "solo admins actualizan fotos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'productos'
    and (auth.jwt() ->> 'email') = 'dr4389742@gmail.com'
  )
  with check (
    bucket_id = 'productos'
    and (auth.jwt() ->> 'email') = 'dr4389742@gmail.com'
  );

create policy "solo admins borran fotos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'productos'
    and (auth.jwt() ->> 'email') = 'dr4389742@gmail.com'
  );
