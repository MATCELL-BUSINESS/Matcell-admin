import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/categorias', label: 'Categorías', icon: '🗂️' },
  { to: '/productos', label: 'Productos', icon: '📦' },
  { to: '/pedidos', label: 'Pedidos', icon: '🧾' },
  { to: '/resenas', label: 'Reseñas', icon: '⭐' },
  { to: '/usuarios', label: 'Usuarios', icon: '👥' },
  { to: '/envios', label: 'Envíos', icon: '🚚' },
  { to: '/configuracion-tienda', label: 'Configuración', icon: '⚙️' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col justify-between border-r border-slate-200 bg-white">
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
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
