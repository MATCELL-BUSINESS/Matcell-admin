-- Reseñas de prueba para ver la pantalla de Reseñas con datos reales.

insert into resenas (nombre_cliente, ciudad, calificacion, comentario, producto_id, aprobada)
values
  ('María Gómez', 'Bogotá', 5,
   'Excelente atención, el iPhone 14 llegó muy bien empacado y como nuevo. ¡Recomendados!',
   'b9929128-01f5-4857-8d40-8ce067877b87'::uuid, true),
  ('Carlos Ramírez', 'Cali', 3,
   'El producto está bien pero tardó un poco más de lo esperado en llegar.',
   '0edced87-6b9a-4765-966f-d7a4119428e5'::uuid, false);
