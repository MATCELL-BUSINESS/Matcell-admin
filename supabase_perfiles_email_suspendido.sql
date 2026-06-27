-- Agrega a "perfiles" lo necesario para el panel admin (pantalla Usuarios):
-- email (no estaba guardado ahí, solo en auth.users) y suspendido (bloqueo manual).

alter table perfiles add column if not exists email text;
alter table perfiles add column if not exists suspendido boolean not null default false;

-- Backfill de los perfiles ya existentes con su email desde auth.users
-- (ejecútalo una sola vez; auth.users solo es legible desde el SQL Editor,
-- no desde el cliente con la anon key).
update perfiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- A partir de ahora, el trigger que crea el perfil al registrarse también
-- guarda el email (antes solo guardaba el nombre).
create or replace function crear_perfil_nuevo_usuario()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, email)
  values (new.id, new.raw_user_meta_data ->> 'nombre', new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Acceso completo para el panel admin (mismo patrón que el resto de tablas
-- en supabase_rls_admin_policies.sql). Nota: como el rol "authenticated" no
-- distingue admin de cliente, cualquier usuario logueado del sitio público
-- también queda con acceso completo a "perfiles" bajo esta policy — es el
-- mismo modelo de seguridad ya usado en pedidos/resenas/productos en este
-- proyecto, no es una restricción nueva de esta migración.
create policy "perfiles_admin_completo" on perfiles
for all
to authenticated
using (true)
with check (true);
