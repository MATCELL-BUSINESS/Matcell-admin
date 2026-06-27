-- Pedido de prueba para ver la pantalla de Pedidos con datos reales.
-- Usa los productos ya existentes (iPhone 14 128GB y iPhone 13 128GB).

with nuevo_pedido as (
  insert into pedidos (
    numero_pedido, cliente_nombre, cliente_telefono, cliente_email,
    direccion, departamento, ciudad,
    metodo_envio, costo_envio, subtotal, total,
    estado_pedido, numero_guia, estado_pago
  ) values (
    'MC-0001', 'Juan Pérez', '3001234567', 'juan.perez@example.com',
    'Calle 45 # 12-34', 'Antioquia', 'Medellín',
    'nacional', 12000, 2900000, 2912000,
    'preparando', null, 'aprobado'
  )
  returning id
)
insert into pedido_items (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario)
select id, 'b9929128-01f5-4857-8d40-8ce067877b87'::uuid, 'iPhone 14 128GB', 1, 1500000 from nuevo_pedido
union all
select id, '0edced87-6b9a-4765-966f-d7a4119428e5'::uuid, 'iPhone 13 128GB', 1, 1400000 from nuevo_pedido;
