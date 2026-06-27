-- Permite variantes con distinto almacenamiento y precio propio (ej. iPhone
-- 128GB vs 256GB), y etiquetar fotos por color para mostrarlas según la
-- variante seleccionada en el sitio público.

alter table producto_variantes add column if not exists almacenamiento text;
alter table producto_variantes add column if not exists precio numeric;

-- Si "color" queda vacío en una foto, es una foto general (se muestra por
-- defecto, sin importar el color elegido).
alter table producto_fotos add column if not exists color text;
