import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/categorias', label: 'Categorías', icon: '🗂️' },
  { to: '/productos', label: 'Productos', icon: '📦' },
  { to: '/pedidos', label: 'Pedidos', icon: '🧾' },
  { to: '/resenas', label: 'Reseñas', icon: '⭐' },
  { to: '/usuarios', label: 'Usuarios', icon: '👥' },
  { to: '/stock', label: 'Stock', icon: '🗃️' },
  { to: '/envios', label: 'Envíos', icon: '🚚' },
  { to: '/configuracion-tienda', label: 'Configuración', icon: '⚙️' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function cerrarSidebar() {
    setSidebarAbierto(false)
  }

  const sidebarContenido = (
    <>
      <div>
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            MC
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">MatCell</p>
            <p className="text-xs text-slate-500">Panel de administración</p>
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={cerrarSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop — siempre visible en md+ */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col justify-between border-r border-slate-200 bg-white">
        {sidebarContenido}
      </aside>

      {/* Drawer móvil — overlay + panel lateral */}
      {sidebarAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Overlay oscuro */}
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={cerrarSidebar}
            aria-hidden="true"
          />
          {/* Panel lateral */}
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col justify-between bg-white shadow-xl">
            {sidebarContenido}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header móvil con botón hamburguesa */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarAbierto(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
              MC
            </div>
            <p className="text-sm font-semibold text-slate-900">MatCell Admin</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
