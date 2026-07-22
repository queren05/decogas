-- ============================================================
-- v9 — Hardening RLS de leads y products (defensa en profundidad)
-- ------------------------------------------------------------
-- El registro público YA está desactivado (fix crítico hecho). Esto
-- es la capa extra: acota por EMAIL de admin quién puede leer clientes
-- y quién puede editar el catálogo, de modo que aunque algún día se
-- reactivara el registro, nadie más podría ver ni tocar nada.
--
-- ⚠️ ANTES DE EJECUTAR: cambia CORREO_DEL_ADMIN (2 sitios) por el email
--    con el que inicias sesión en el panel.
--
-- ⚠️ IMPORTANTE — lo que se PRESERVA (no se rompe la web):
--    · Cualquiera puede ENVIAR el formulario de contacto (INSERT leads).
--    · Cualquiera puede VER el catálogo (SELECT products).
--    Solo se restringe: LEER clientes y ESCRIBIR/EDITAR productos.
--
-- CÓMO EJECUTARLO: Supabase → SQL Editor → New query → pega TODO → Run.
-- Tras ejecutarlo: entra en la web y comprueba que el catálogo carga y
-- que el formulario envía; entra al panel y comprueba que ves los leads.
-- ============================================================

-- ---------- LEADS (clientes del formulario) ----------
alter table public.leads enable row level security;

-- Limpieza: elimina cualquier política previa (sean cuales sean sus nombres)
do $$ declare pol record; begin
  for pol in select policyname from pg_policies
             where schemaname='public' and tablename='leads' loop
    execute format('drop policy if exists %I on public.leads', pol.policyname);
  end loop;
end $$;

-- Cualquiera (anónimo) puede CREAR un lead → el formulario sigue funcionando.
create policy "anon crea leads" on public.leads
  for insert to anon, authenticated with check (true);

-- SOLO el admin puede LEER / EDITAR / BORRAR los clientes.
create policy "admin lee leads" on public.leads
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN');
create policy "admin edita leads" on public.leads
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN')
  with check ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN');
create policy "admin borra leads" on public.leads
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN');


-- ---------- PRODUCTS (catálogo) ----------
alter table public.products enable row level security;

do $$ declare pol record; begin
  for pol in select policyname from pg_policies
             where schemaname='public' and tablename='products' loop
    execute format('drop policy if exists %I on public.products', pol.policyname);
  end loop;
end $$;

-- Cualquiera puede LEER el catálogo → la web pública sigue mostrando productos.
create policy "todos leen products" on public.products
  for select to anon, authenticated using (true);

-- SOLO el admin puede CREAR / EDITAR / BORRAR productos.
create policy "admin crea products" on public.products
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN');
create policy "admin edita products" on public.products
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN')
  with check ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN');
create policy "admin borra products" on public.products
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'CORREO_DEL_ADMIN');

-- Listo. Comprueba web (catálogo + formulario) y panel (leds visibles).
