# MatCell Admin

Panel de administración (React + Vite + Supabase) para gestionar la tienda MatCell:
categorías, productos, pedidos, reseñas y configuración de envíos.

## 1. Configurar variables de entorno

```bash
cp .env.example .env
```

Completa `.env` con los datos de tu proyecto de Supabase (Project Settings → API):

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

## 2. Instalar y correr en desarrollo

```bash
npm install
npm run dev
```

## 3. Crear el usuario administrador

No hay registro público: el único usuario se crea manualmente desde Supabase.

1. Ve a tu proyecto en supabase.com → **Authentication → Users → Add user**.
2. Crea el usuario con tu correo y una contraseña, marcando **Auto Confirm User**.
3. Usa ese correo/contraseña para iniciar sesión en el panel.

## 4. Revisar las políticas RLS (importante)

Como ya tienes RLS activado en `categorias`, `subcategorias`, `productos`,
`producto_fotos`, `pedidos`, `pedido_items`, `resenas` y `config_envios`,
asegúrate de tener una policy que permita **leer y escribir solo a usuarios
autenticados** (rol `authenticated`), por ejemplo:

```sql
create policy "Acceso admin autenticado"
on public.categorias
for all
to authenticated
using (true)
with check (true);
```

Repite (ajustando el nombre) para cada tabla que el panel necesita gestionar.
Esto evita tocar código: simplemente das permisos en SQL una sola vez por tabla.

## 5. Bucket de Storage "productos"

Para la subida de fotos de productos (pantalla "Productos", próximo paso),
asegúrate de que el bucket `productos` exista en Storage y tenga una policy
que permita `insert`/`select`/`delete` al rol `authenticated`.

## Estructura del proyecto

```
src/
  lib/supabase.js          Cliente de Supabase (usa las env vars)
  context/AuthContext.jsx  Maneja sesión, login y logout
  components/
    ProtectedRoute.jsx     Redirige a /login si no hay sesión
    Layout.jsx             Sidebar + contenedor de páginas
    PageHeader.jsx         Encabezado reutilizable de cada pantalla
  pages/
    Login.jsx              Pantalla de login
    Categorias.jsx          (placeholder, próximo paso)
    Productos.jsx           (placeholder, próximo paso)
    Pedidos.jsx              (placeholder, próximo paso)
    Resenas.jsx              (placeholder, próximo paso)
    ConfiguracionEnvios.jsx  (placeholder, próximo paso)
  App.jsx                  Definición de rutas
```

## Próximos pasos

Cada pantalla de gestión (Categorías, Productos, Pedidos, Reseñas, Envíos)
se construye una por una sobre esta misma base.
