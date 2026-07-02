import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'

const COLORES_ESTADO = {
  confirmado: '#3b82f6',
  preparando: '#f59e0b',
  enviado: '#6366f1',
  en_camino: '#a855f7',
  entregado: '#22c55e',
  cancelado: '#ef4444',
}

const LABELS_ESTADO = {
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const COLORES_CATEGORIA = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4']

const UMBRAL_STOCK_BAJO = 2

function formatPrecio(valor) {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    valor
  )
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function inicioDeMes(offsetMeses = 0) {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth() + offsetMeses, 1)
}

function cambioPorcentual(actual, anterior) {
  if (!anterior) return actual > 0 ? 100 : 0
  return ((actual - anterior) / anterior) * 100
}

function TarjetaTotal({ titulo, valor, cambio, enlace }) {
  const positivo = cambio >= 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{valor}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs font-medium ${positivo ? 'text-green-600' : 'text-red-600'}`}>
          {positivo ? '▲' : '▼'} {Math.abs(cambio).toFixed(1)}% vs. mes anterior
        </span>
        {enlace && (
          <Link to={enlace} className="text-xs font-medium text-brand-600 hover:underline">
            Ver
          </Link>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pedidos, setPedidos] = useState([])
  const [pedidoItems, setPedidoItems] = useState([])
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [variantes, setVariantes] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [resenasPendientes, setResenasPendientes] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [pedidosRes, itemsRes, productosRes, categoriasRes, variantesRes, perfilesRes, resenasRes] =
        await Promise.all([
          supabase.from('pedidos').select('*').order('creado_en', { ascending: false }),
          supabase.from('pedido_items').select('*'),
          supabase.from('productos').select('*'),
          supabase.from('categorias').select('*'),
          supabase.from('producto_variantes').select('*'),
          supabase.from('perfiles').select('id, creado_en'),
          supabase.from('resenas').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        ])
      if (pedidosRes.error) throw pedidosRes.error
      if (itemsRes.error) throw itemsRes.error
      if (productosRes.error) throw productosRes.error
      if (categoriasRes.error) throw categoriasRes.error
      if (variantesRes.error) throw variantesRes.error
      if (perfilesRes.error) throw perfilesRes.error
      if (resenasRes.error) throw resenasRes.error

      setPedidos(pedidosRes.data || [])
      setPedidoItems(itemsRes.data || [])
      setProductos(productosRes.data || [])
      setCategorias(categoriasRes.data || [])
      setVariantes(variantesRes.data || [])
      setPerfiles(perfilesRes.data || [])
      setResenasPendientes(resenasRes.count || 0)
    } catch (err) {
      setError('No se pudo cargar el dashboard. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const pedidosNoCancelados = useMemo(() => pedidos.filter((p) => p.estado_pedido !== 'cancelado'), [pedidos])

  // ---- Tarjetas de totales con cambio % vs. mes anterior ----

  const resumenMeses = useMemo(() => {
    const inicioActual = inicioDeMes(0)
    const inicioAnterior = inicioDeMes(-1)

    const enMes = (fechaIso, desde, hasta) => {
      const f = new Date(fechaIso)
      return f >= desde && (!hasta || f < hasta)
    }

    const pedidosMesActual = pedidos.filter((p) => enMes(p.creado_en, inicioActual))
    const pedidosMesAnterior = pedidos.filter((p) => enMes(p.creado_en, inicioAnterior, inicioActual))

    const ingresosMesActual = pedidosMesActual
      .filter((p) => p.estado_pedido !== 'cancelado')
      .reduce((s, p) => s + (p.total || 0), 0)
    const ingresosMesAnterior = pedidosMesAnterior
      .filter((p) => p.estado_pedido !== 'cancelado')
      .reduce((s, p) => s + (p.total || 0), 0)

    const productosActivosActual = productos.filter((p) => p.activo).length
    const productosActivosAnterior = productos.filter(
      (p) => p.activo && new Date(p.creado_en) < inicioActual
    ).length

    const clientesActual = perfiles.length
    const clientesAnterior = perfiles.filter((p) => new Date(p.creado_en) < inicioActual).length

    return {
      pedidosTotales: pedidos.length,
      cambioPedidos: cambioPorcentual(pedidosMesActual.length, pedidosMesAnterior.length),
      ingresosTotales: pedidosNoCancelados.reduce((s, p) => s + (p.total || 0), 0),
      cambioIngresos: cambioPorcentual(ingresosMesActual, ingresosMesAnterior),
      productosActivos: productosActivosActual,
      cambioProductos: cambioPorcentual(productosActivosActual, productosActivosAnterior),
      clientesRegistrados: clientesActual,
      cambioClientes: cambioPorcentual(clientesActual, clientesAnterior),
    }
  }, [pedidos, pedidosNoCancelados, productos, perfiles])

  // ---- Ventas de los últimos 30 días ----

  const ventas30Dias = useMemo(() => {
    const dias = []
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    for (let i = 29; i >= 0; i--) {
      const dia = new Date(hoy)
      dia.setDate(dia.getDate() - i)
      dias.push(dia)
    }
    const totalesPorDia = dias.map((dia) => {
      const siguienteDia = new Date(dia)
      siguienteDia.setDate(siguienteDia.getDate() + 1)
      const total = pedidosNoCancelados
        .filter((p) => {
          const f = new Date(p.creado_en)
          return f >= dia && f < siguienteDia
        })
        .reduce((s, p) => s + (p.total || 0), 0)
      return {
        fecha: dia.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
        total,
      }
    })
    return totalesPorDia
  }, [pedidosNoCancelados])

  // ---- Pedidos por estado ----

  const pedidosPorEstado = useMemo(() => {
    const conteo = {}
    for (const p of pedidos) {
      conteo[p.estado_pedido] = (conteo[p.estado_pedido] || 0) + 1
    }
    return Object.entries(conteo).map(([estado, cantidad]) => ({
      estado,
      nombre: LABELS_ESTADO[estado] || estado,
      cantidad,
    }))
  }, [pedidos])

  // ---- Top 5 productos más vendidos ----

  const topProductos = useMemo(() => {
    const conteo = {}
    for (const item of pedidoItems) {
      conteo[item.nombre_producto] = (conteo[item.nombre_producto] || 0) + (item.cantidad || 0)
    }
    return Object.entries(conteo)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
  }, [pedidoItems])

  // ---- Ingresos por categoría ----

  const ingresosPorCategoria = useMemo(() => {
    const productoPorId = {}
    for (const p of productos) productoPorId[p.id] = p
    const categoriaPorId = {}
    for (const c of categorias) categoriaPorId[c.id] = c

    const conteo = {}
    for (const item of pedidoItems) {
      const producto = productoPorId[item.producto_id]
      const categoria = producto ? categoriaPorId[producto.categoria_id] : null
      const nombre = categoria?.nombre || 'Sin categoría'
      conteo[nombre] = (conteo[nombre] || 0) + (item.cantidad || 0) * (item.precio_unitario || 0)
    }
    return Object.entries(conteo).map(([nombre, total]) => ({ nombre, total }))
  }, [productos, categorias, pedidoItems])

  // ---- Alertas de stock bajo ----

  const stockBajo = useMemo(() => {
    const stockPorProducto = {}
    for (const v of variantes) {
      stockPorProducto[v.producto_id] = (stockPorProducto[v.producto_id] || 0) + (v.stock || 0)
    }
    return productos
      .filter((p) => p.activo)
      .map((p) => ({ ...p, stockTotal: stockPorProducto[p.id] ?? p.stock ?? 0 }))
      .filter((p) => p.stockTotal <= UMBRAL_STOCK_BAJO)
      .sort((a, b) => a.stockTotal - b.stockTotal)
  }, [productos, variantes])

  const pedidosRecientes = useMemo(() => pedidos.slice(0, 10), [pedidos])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Cargando dashboard…
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Resumen general de la tienda." />

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid grid-cols-4 gap-4">
        <TarjetaTotal
          titulo="Pedidos totales"
          valor={resumenMeses.pedidosTotales}
          cambio={resumenMeses.cambioPedidos}
          enlace="/pedidos"
        />
        <TarjetaTotal
          titulo="Ingresos totales"
          valor={formatPrecio(resumenMeses.ingresosTotales)}
          cambio={resumenMeses.cambioIngresos}
          enlace="/pedidos"
        />
        <TarjetaTotal
          titulo="Productos activos"
          valor={resumenMeses.productosActivos}
          cambio={resumenMeses.cambioProductos}
          enlace="/productos"
        />
        <TarjetaTotal
          titulo="Clientes registrados"
          valor={resumenMeses.clientesRegistrados}
          cambio={resumenMeses.cambioClientes}
          enlace="/usuarios"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Ventas de los últimos 30 días</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ventas30Dias}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval={3} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatPrecio(v)} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Pedidos por estado</h3>
          {pedidosPorEstado.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Sin pedidos todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pedidosPorEstado}
                  dataKey="cantidad"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  label={({ nombre, cantidad }) => `${nombre}: ${cantidad}`}
                >
                  {pedidosPorEstado.map((entry) => (
                    <Cell key={entry.estado} fill={COLORES_ESTADO[entry.estado] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Top 5 productos más vendidos</h3>
          {topProductos.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Aún no hay ventas registradas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductos} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Ingresos por categoría</h3>
          {ingresosPorCategoria.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Aún no hay ventas registradas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ingresosPorCategoria}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => formatPrecio(v)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {ingresosPorCategoria.map((entry, i) => (
                    <Cell key={entry.nombre} fill={COLORES_CATEGORIA[i % COLORES_CATEGORIA.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Alertas de stock bajo (≤ {UMBRAL_STOCK_BAJO} unidades)</h3>
          </div>
          {stockBajo.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No hay productos con stock bajo. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {stockBajo.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-amber-700">Stock total: {p.stockTotal}</p>
                  </div>
                  <Link
                    to={`/productos?id=${p.id}`}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          to="/resenas"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-center transition-colors hover:bg-slate-50"
        >
          <span className="text-4xl">⭐</span>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{resenasPendientes}</p>
          <p className="text-sm text-slate-500">Reseñas pendientes de aprobar</p>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-700">Últimos 10 pedidos</h3>
          <Link to="/pedidos" className="text-xs font-medium text-brand-600 hover:underline">
            Ver todos
          </Link>
        </div>
        {pedidosRecientes.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">No hay pedidos todavía.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2">N° pedido</th>
                <th className="px-5 py-2">Cliente</th>
                <th className="px-5 py-2">Total</th>
                <th className="px-5 py-2">Estado</th>
                <th className="px-5 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pedidosRecientes.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-5 py-2.5 font-medium text-slate-900">{p.numero_pedido}</td>
                  <td className="px-5 py-2.5 text-slate-700">{p.cliente_nombre}</td>
                  <td className="px-5 py-2.5 text-slate-700">{formatPrecio(p.total)}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${COLORES_ESTADO[p.estado_pedido] || '#94a3b8'}1a`,
                        color: COLORES_ESTADO[p.estado_pedido] || '#475569',
                      }}
                    >
                      {LABELS_ESTADO[p.estado_pedido] || p.estado_pedido}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-slate-500">{formatFecha(p.creado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
