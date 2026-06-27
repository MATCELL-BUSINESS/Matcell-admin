-- Variantes de producto (color + stock, y opcionalmente modelo compatible para
-- accesorios que aplican a varios modelos) + características de texto para Accesorios.

create table producto_variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  modelo_compatible text,
  color text not null,
  stock integer not null default 0
);

alter table producto_variantes enable row level security;

create policy "producto_variantes_admin_completo" on producto_variantes
for all
to authenticated
using (true)
with check (true);

-- El stock de "productos" pasa a ser un total calculado a partir de sus variantes,
-- así el listado nunca puede desincronizarse del detalle real por variante.
alter table productos alter column stock set default 0;

create or replace function recalc_stock_producto()
returns trigger as $$
declare
  pid uuid;
begin
  pid := coalesce(new.producto_id, old.producto_id);
  update productos
  set stock = coalesce((select sum(stock) from producto_variantes where producto_id = pid), 0)
  where id = pid;
  return null;
end;
$$ language plpgsql;

create trigger trg_variantes_recalc_stock
after insert or update or delete on producto_variantes
for each row execute function recalc_stock_producto();

-- Características de texto corto (solo aplican a Accesorios; null/vacío para el resto).
alter table productos add column caracteristicas text[] default '{}';

-- Migración de los productos de prueba existentes: el color y stock que ya tenían
-- a nivel de producto se convierte en su primera variante (sin modelo compatible,
-- porque son celulares).
insert into producto_variantes (producto_id, modelo_compatible, color, stock)
select id, null, coalesce(color, 'Único'), stock
from productos
where id in ('b9929128-01f5-4857-8d40-8ce067877b87', '0edced87-6b9a-4765-966f-d7a4119428e5');
