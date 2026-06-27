-- Configuración general de la tienda, editable desde el panel admin y leída
-- por el sitio público (WhatsApp, redes sociales, mensaje de la barra superior, etc).
-- Es una tabla de una sola fila (singleton).

create table if not exists tienda_config (
  id uuid primary key default gen_random_uuid(),
  nombre_tienda text,
  whatsapp text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  descripcion_footer text,
  mensaje_barra_superior text,
  actualizado_en timestamptz not null default now()
);

alter table tienda_config enable row level security;

create policy "tienda_config_publico_lectura" on tienda_config
for select
to anon, authenticated
using (true);

create policy "tienda_config_admin_completo" on tienda_config
for all
to authenticated
using (true)
with check (true);

insert into tienda_config (nombre_tienda, whatsapp, instagram_url, facebook_url, tiktok_url, descripcion_footer, mensaje_barra_superior)
select 'MatCell', '', '', '', '', '', ''
where not exists (select 1 from tienda_config);
