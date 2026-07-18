-- ============================================================
-- MIGRACIÓN V6 — SEGURIDAD DEL BUCKET DE IMÁGENES
-- Ejecutar en Supabase → SQL Editor (una vez, DESPUÉS del v5).
--
-- PROBLEMA QUE CORRIGE:
--   Las políticas de escritura del v5 se llaman "solo admins ..." pero
--   en realidad NO comprueban quién es el usuario: solo verifican
--   bucket_id = 'productos' con "to authenticated". Eso significa que
--   CUALQUIER usuario autenticado (por ejemplo, alguien que se registre
--   solo por su cuenta si el registro público está abierto) podría
--   subir, actualizar o borrar fotos del catálogo.
--
--   Esta migración elimina esas 3 políticas de escritura y las recrea
--   restringidas AL EMAIL DEL ADMINISTRADOR, usando el claim "email"
--   del JWT: (auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN'.
--
-- >>> ACCIÓN OBLIGATORIA ANTES DE EJECUTAR <<<
--   Sustituye el PLACEHOLDER  CORREO_DEL_ADMIN  (aparece 3 veces abajo)
--   por el email real del administrador, EXACTAMENTE como figura en
--   Supabase → Authentication → Users (respeta mayúsculas/minúsculas).
--
-- >>> RECOMENDACIÓN ADICIONAL DE SEGURIDAD <<<
--   Desactiva el registro público en Supabase → Authentication →
--   Providers → Email → "Allow new users to sign up" (OFF). Así nadie
--   podrá crearse una cuenta autenticada por su cuenta. La lectura de
--   las fotos sigue siendo pública (política de select del v5 intacta).
-- ============================================================

-- 1) INSERT (subir fotos) — solo el admin
drop policy if exists "solo admins suben fotos" on storage.objects;
create policy "solo admins suben fotos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'productos'
    and (auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN'
  );

-- 2) UPDATE (reemplazar fotos) — solo el admin
drop policy if exists "solo admins actualizan fotos" on storage.objects;
create policy "solo admins actualizan fotos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'productos'
    and (auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN'
  );

-- 3) DELETE (borrar fotos) — solo el admin
drop policy if exists "solo admins borran fotos" on storage.objects;
create policy "solo admins borran fotos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'productos'
    and (auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN'
  );

-- Verificación: lista las políticas de escritura del bucket ya recreadas.
select policyname, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'solo admins suben fotos',
    'solo admins actualizan fotos',
    'solo admins borran fotos'
  );
