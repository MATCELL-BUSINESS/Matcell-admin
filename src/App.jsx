import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Categorias from './pages/Categorias'
import Productos from './pages/Productos'
import Pedidos from './pages/Pedidos'
import Resenas from './pages/Resenas'
import Usuarios from './pages/Usuarios'
import ConfiguracionEnvios from './pages/ConfiguracionEnvios'
import ConfiguracionTienda from './pages/ConfiguracionTienda'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/resenas" element={<Resenas />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/envios" element={<ConfiguracionEnvios />} />
              <Route path="/configuracion-tienda" element={<ConfiguracionTienda />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
