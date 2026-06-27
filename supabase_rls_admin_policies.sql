-- Policy de acceso completo para el rol "authenticated" (panel admin).
-- No reemplaza ni borra las policies publicas existentes (ej. categorias_publicas):
-- en RLS, varias policies "permissive" se combinan con OR, asi que esto solo
-- amplia el acceso del admin sin afectar lo que ya ve el publico.

create policy "subcategorias_admin_completo" on subcategorias
for all
to authenticated
using (true)
with check (true);

create policy "productos_admin_completo" on productos
for all
to authenticated
using (true)
with check (true);

create policy "producto_fotos_admin_completo" on producto_fotos
for all
to authenticated
using (true)
with check (true);

create policy "pedidos_admin_completo" on pedidos
for all
to authenticated
using (true)
with check (true);

create policy "pedido_items_admin_completo" on pedido_items
for all
to authenticated
using (true)
with check (true);

create policy "resenas_admin_completo" on resenas
for all
to authenticated
using (true)
with check (true);

create policy "config_envios_admin_completo" on config_envios
for all
to authenticated
using (true)
with check (true);
