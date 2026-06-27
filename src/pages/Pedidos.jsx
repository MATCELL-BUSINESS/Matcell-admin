import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const ESTADOS_PEDIDO = [
  { value: 'confirmado', label: 'Confirmado', clase: 'bg-blue-50 text-blue-700' },
  { value: 'preparando', label: 'Preparando', clase: 'bg-amber-50 text-amber-700' },
  { value: 'enviado', label: 'Enviado', clase: 'bg-indigo-50 text-indigo-700' },
  { value: 'en_camino', label: 'En camino', clase: 'bg-purple-50 text-purple-700' },
  { value: 'entregado', label: 'Entregado', clase: 'bg-green-50 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', clase: 'bg-red-50 text-red-700' },
]

const METODOS_ENVIO = {
  nacional: 'Envío nacional (Coordinadora)',
  recogida_local: 'Recogida en tienda',
}

const ESTADOS_PAGO = {
  pendiente: 'bg-amber-50 text-amber-700',
  aprobado: 'bg-green-50 text-green-700',
  rechazado: 'bg-red-50 text-red-700',
}

function badgeEstadoPedido(estado) {
  const info = ESTADOS_PEDIDO.find((e) => e.value === estado)
  return {
    label: info?.label || estado,
    clase: info?.clase || 'bg-slate-100 text-slate-600',
  }
}

function badgeEstadoPago(estado) {
  return ESTADOS_PAGO[estado] || 'bg-slate-100 text-slate-600'
}

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

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [detalle, setDetalle] = useState({ open: false, pedido: null })
  const [items, setItems] = useState([])
  const [cargandoItems, setCargandoItems] = useState(false)
  const [errorItems, setErrorItems] = useState('')

  useEffect(() => {
    loadPedidos()
  }, [])

  async function loadPedidos() {
    setLoading(true)
    setError('')
    try {
      const { data, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .order('creado_en', { ascending: false })
      if (pedidosError) throw pedidosError
      setPedidos(data || [])
    } catch (err) {
      setError('No se pudieron cargar los pedidos. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const pedidosFiltrados = useMemo(() => {
    if (!filtroEstado) return pedidos
    return pedidos.filter((p) => p.estado_pedido === filtroEstado)
  }, [pedidos, filtroEstado])

  async function abrirDetalle(pedido) {
    setDetalle({ open: true, pedido })
    setItems([])
    setErrorItems('')
    setCargandoItems(true)
    try {
      const { data, error: itemsError } = await supabase
        .from('pedido_items')
        .select('*')
        .eq('pedido_id', pedido.id)
      if (itemsError) throw itemsError
      setItems(data || [])
    } catch (err) {
      setErrorItems('No se pudieron cargar los productos del pedido. ' + err.message)
    } finally {
      setCargandoItems(false)
    }
  }

  function cerrarDetalle() {
    setDetalle({ open: false, pedido: null })
    setItems([])
  }

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Consulta pedidos, su estado y número de guía (sincronizado vía Coordinadora)."
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Filtrar por estado:</label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todos</option>
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando pedidos…
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay pedidos para mostrar.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">N° pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado pedido</th>
                <th className="px-4 py-3">Estado pago</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((pedido) => {
                const estadoPedido = badgeEstadoPedido(pedido.estado_pedido)
                return (
                  <tr
                    key={pedido.id}
                    onClick={() => abrirDetalle(pedido)}
                    className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{pedido.numero_pedido}</td>
                    <td className="px-4 py-3 text-slate-700">{pedido.cliente_nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{pedido.ciudad || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatPrecio(pedido.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoPedido.clase}`}>
                        {estadoPedido.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeEstadoPago(
                          pedido.estado_pago
                        )}`}
                      >
                        {pedido.estado_pago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatFecha(pedido.creado_en)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={detalle.open}
        title={detalle.pedido ? `Pedido ${detalle.pedido.numero_pedido}` : 'Pedido'}
        onClose={cerrarDetalle}
        maxWidth="max-w-2xl"
      >
        {detalle.pedido && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              {(() => {
                const estadoPedido = badgeEstadoPedido(detalle.pedido.estado_pedido)
                return (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoPedido.clase}`}>
                    {estadoPedido.label}
                  </span>
                )
              })()}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeEstadoPago(
                  detalle.pedido.estado_pago
                )}`}
              >
                Pago: {detalle.pedido.estado_pago}
              </span>
              <span className="text-xs text-slate-500">{formatFecha(detalle.pedido.creado_en)}</span>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Datos del cliente
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Nombre</dt>
                  <dd className="font-medium text-slate-900">{detalle.pedido.cliente_nombre}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Teléfono</dt>
                  <dd className="font-medium text-slate-900">{detalle.pedido.cliente_telefono}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900">{detalle.pedido.cliente_email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Dirección</dt>
                  <dd className="font-medium text-slate-900">{detalle.pedido.direccion || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Departamento</dt>
                  <dd className="font-medium text-slate-900">{detalle.pedido.departamento || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ciudad</dt>
                  <dd className="font-medium text-slate-900">{detalle.pedido.ciudad || '—'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Envío</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Método de envío</dt>
                  <dd className="font-medium text-slate-900">
                    {METODOS_ENVIO[detalle.pedido.metodo_envio] || detalle.pedido.metodo_envio}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Número de guía</dt>
                  <dd className="font-medium text-slate-900">{detalle.pedido.numero_guia || 'Aún sin asignar'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Costo de envío</dt>
                  <dd className="font-medium text-slate-900">{formatPrecio(detalle.pedido.costo_envio)}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Productos</h3>
              {errorItems && (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorItems}</p>
              )}
              {cargandoItems ? (
                <p className="text-sm text-slate-500">Cargando productos…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-500">Este pedido no tiene productos registrados.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Precio unitario</th>
                        <th className="px-3 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-900">{item.nombre_producto}</td>
                          <td className="px-3 py-2 text-slate-700">{item.cantidad}</td>
                          <td className="px-3 py-2 text-slate-700">{formatPrecio(item.precio_unitario)}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatPrecio(item.cantidad * item.precio_unitario)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-6 border-t border-slate-200 pt-4 text-sm">
              <div>
                <span className="text-slate-500">Subtotal: </span>
                <span className="font-medium text-slate-900">{formatPrecio(detalle.pedido.subtotal)}</span>
              </div>
              <div>
                <span className="text-slate-500">Envío: </span>
                <span className="font-medium text-slate-900">{formatPrecio(detalle.pedido.costo_envio)}</span>
              </div>
              <div>
                <span className="text-slate-500">Total: </span>
                <span className="font-semibold text-slate-900">{formatPrecio(detalle.pedido.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
