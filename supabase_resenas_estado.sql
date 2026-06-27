-- Agrega un estado explícito y reversible a las reseñas (pendiente/aprobada/rechazada),
-- migra los datos existentes desde "aprobada", y mantiene "aprobada" sincronizada
-- automáticamente a partir de "estado" para no romper nada que ya dependa de ella.

alter table resenas add column estado text not null default 'pendiente';

alter table resenas
  add constraint resenas_estado_check check (estado in ('pendiente', 'aprobada', 'rechazada'));

update resenas
set estado = case when aprobada then 'aprobada' else 'pendiente' end;

create or replace function sync_resena_aprobada()
returns trigger as $$
begin
  new.aprobada := (new.estado = 'aprobada');
  return new;
end;
$$ language plpgsql;

create trigger trg_resenas_sync_aprobada
before insert or update on resenas
for each row execute function sync_resena_aprobada();
