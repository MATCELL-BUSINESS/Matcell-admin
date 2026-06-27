-- Hex del color de la variante, para pintar el círculo de color con precisión
-- en el sitio público. El campo "color" sigue siendo el nombre para mostrar
-- (ej. "Azul medianoche").
alter table producto_variantes add column if not exists color_hex text;
