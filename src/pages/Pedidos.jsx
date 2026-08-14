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

const TRANSPORTADORAS_FALLBACK = [
  { distributor_id: 'coordinadora', nombre: 'Coordinadora' },
  { distributor_id: 'servientrega',  nombre: 'Servientrega' },
  { distributor_id: 'interrapidisimo', nombre: 'Interrapidísimo' },
  { distributor_id: 'envia',         nombre: 'Envía' },
  { distributor_id: 'tcc',           nombre: 'TCC' },
]

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

async function callHeka(action, extra = {}) {
  const { data, error } = await supabase.functions.invoke('heka-guia', {
    body: { action, ...extra },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
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

  // Modal generar guía
  const [modalGuia, setModalGuia] = useState({ open: false, pedido: null })
  const [bodegas, setBodegas] = useState([])
  const [transportadoras, setTransportadoras] = useState([])
  const [warehouseId, setWarehouseId] = useState('')
  const [distributorId, setDistributorId] = useState('')
  const [cargandoGuia, setCargandoGuia] = useState(false)
  const [guiaGenerada, setGuiaGenerada] = useState('')
  const [errorGuia, setErrorGuia] = useState('')
  const [cargandoPdf, setCargandoPdf] = useState(null)

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

  async function abrirModalGuia(pedido) {
    setModalGuia({ open: true, pedido })
    setBodegas([])
    setTransportadoras([])
    setWarehouseId('')
    setDistributorId(pedido.transportadora_elegida || '')
    setGuiaGenerada('')
    setErrorGuia('')
    setCargandoGuia(true)
    try {
      const [bodegasData, transData] = await Promise.all([
        callHeka('listar_bodegas'),
        callHeka('listar_transportadoras', { pedido_id: pedido.id }),
      ])
      setBodegas(bodegasData.bodegas ?? [])
      const lista = transData.transportadoras?.length
        ? transData.transportadoras
        : TRANSPORTADORAS_FALLBACK
      setTransportadoras(lista)
      if (!distributorId && lista.length > 0) setDistributorId(lista[0].distributor_id)
    } catch (err) {
      setErrorGuia('No se pudieron cargar bodegas/transportadoras: ' + err.message)
    } finally {
      setCargandoGuia(false)
    }
  }

  function cerrarModalGuia() {
    setModalGuia({ open: false, pedido: null })
  }

  async function descargarPdf(pedido) {
    setCargandoPdf(pedido.id)
    try {
      const { data, error } = await supabase.functions.invoke('heka-guia', {
        body: { action: 'descargar_pdf', shipment_id: pedido.heka_shipment_id },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      if (data.tipo === 'pdf_base64') {
        const bytes = Uint8Array.from(atob(data.contenido), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `guia-${pedido.heka_guide_number}.pdf`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } else if (data.tipo === 'url') {
        window.open(data.contenido, '_blank')
      } else {
        throw new Error('Formato de respuesta no reconocido: ' + JSON.stringify(data.contenido))
      }
    } catch (err) {
      setError('No se pudo descargar el PDF: ' + err.message)
    } finally {
      setCargandoPdf(null)
    }
  }

  async function generarGuia() {
    if (!warehouseId || !distributorId) {
      setErrorGuia('Selecciona bodega y transportadora.')
      return
    }
    setErrorGuia('')
    setCargandoGuia(true)
    try {
      const data = await callHeka('crear_guia', {
        pedido_id: modalGuia.pedido.id,
        distributor_id: distributorId,
        warehouse_id: warehouseId,
      })
      setGuiaGenerada(String(data.guide_number))
      // Reflejar en la lista local
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === modalGuia.pedido.id
            ? { ...p, numero_guia: String(data.guide_number), heka_guide_number: String(data.guide_number), estado_pedido: 'enviado' }
            : p
        )
      )
      if (detalle.pedido?.id === modalGuia.pedido.id) {
        setDetalle((d) => ({
          ...d,
          pedido: { ...d.pedido, numero_guia: String(data.guide_number), estado_pedido: 'enviado' },
        }))
      }
    } catch (err) {
      setErrorGuia(err.message)
    } finally {
      setCargandoGuia(false)
    }
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <div className="flex gap-6 text-sm">
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
              {detalle.pedido.metodo_envio !== 'recogida_local' && (
                detalle.pedido.heka_guide_number ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      Guía: {detalle.pedido.heka_guide_number}
                    </span>
                    {detalle.pedido.heka_shipment_id && (
                      <button
                        type="button"
                        disabled={cargandoPdf === detalle.pedido.id}
                        onClick={() => descargarPdf(detalle.pedido)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:opacity-50"
                      >
                        {cargandoPdf === detalle.pedido.id ? 'Descargando…' : '📄 Descargar guía PDF'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirModalGuia(detalle.pedido)}
                    className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    📦 Generar guía
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal generar guía Heka */}
      {modalGuia.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Generar guía — {modalGuia.pedido?.numero_pedido}
              </h2>
              <button
                type="button"
                onClick={cerrarModalGuia}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {guiaGenerada ? (
                <div className="rounded-xl bg-green-50 p-4 text-center">
                  <p className="text-sm font-medium text-green-700">¡Guía generada exitosamente!</p>
                  <p className="mt-1 text-2xl font-bold text-green-800">{guiaGenerada}</p>
                  <p className="mt-1 text-xs text-green-600">El pedido fue marcado como Enviado.</p>
                </div>
              ) : (
                <>
                  {errorGuia && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorGuia}</p>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Bodega de despacho</label>
                    {cargandoGuia && bodegas.length === 0 ? (
                      <p className="text-xs text-slate-400">Cargando bodegas…</p>
                    ) : (
                      <select
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      >
                        <option value="">— Selecciona bodega —</option>
                        {bodegas.map((b) => (
                          <option key={b.id ?? b.warehouse_id ?? b.name} value={b.id ?? b.warehouse_id}>
                            {b.name ?? b.nombre ?? b.id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Transportadora</label>
                    {cargandoGuia && transportadoras.length === 0 ? (
                      <p className="text-xs text-slate-400">Cargando transportadoras…</p>
                    ) : (
                      <select
                        value={distributorId}
                        onChange={(e) => setDistributorId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      >
                        <option value="">— Selecciona transportadora —</option>
                        {transportadoras.map((t) => (
                          <option key={t.distributor_id} value={t.distributor_id}>
                            {t.nombre}
                            {t.precio ? ` — ${formatPrecio(t.precio)}` : ''}
                            {t.tiempo ? ` · ${t.tiempo}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {modalGuia.pedido?.transportadora_elegida && (
                      <p className="mt-1 text-xs text-slate-400">
                        El cliente eligió: {modalGuia.pedido.transportadora_elegida}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              {guiaGenerada ? (
                <button
                  type="button"
                  onClick={cerrarModalGuia}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Cerrar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={cerrarModalGuia}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={cargandoGuia || !warehouseId || !distributorId}
                    onClick={generarGuia}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-default disabled:opacity-50"
                  >
                    {cargandoGuia ? 'Procesando…' : 'Confirmar y generar'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
