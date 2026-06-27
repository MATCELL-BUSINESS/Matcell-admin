import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const DIAS_SIN_ACTIVIDAD = 90

function formatPrecio(valor) {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    valor
  )
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ciudadMasFrecuente(pedidosUsuario) {
  const conteo = {}
  for (const p of pedidosUsuario) {
    if (!p.ciudad) continue
    const clave = p.departamento ? `${p.ciudad} (${p.departamento})` : p.ciudad
    conteo[clave] = (conteo[clave] || 0) + 1
  }
  const entradas = Object.entries(conteo)
  if (entradas.length === 0) return '—'
  return entradas.sort((a, b) => b[1] - a[1])[0][0]
}

export default function Usuarios() {
  const [perfiles, setPerfiles] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [historial, setHistorial] = useState({ open: false, perfil: null })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [perfilesRes, pedidosRes, wishlistRes] = await Promise.all([
        supabase.from('perfiles').select('*').order('creado_en', { ascending: false }),
        supabase.from('pedidos').select('*'),
        supabase.from('lista_deseos').select('usuario_id'),
      ])
      if (perfilesRes.error) throw perfilesRes.error
      if (pedidosRes.error) throw pedidosRes.error
      if (wishlistRes.error) throw wishlistRes.error

      setPerfiles(perfilesRes.data || [])
      setPedidos(pedidosRes.data || [])
      setWishlist(wishlistRes.data || [])
    } catch (err) {
      setError('No se pudieron cargar los usuarios. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filasUsuarios = useMemo(() => {
    const ahora = new Date()
    return perfiles.map((perfil) => {
      const pedidosUsuario = pedidos.filter((p) => p.usuario_id === perfil.id)
      const pedidosValidos = pedidosUsuario.filter((p) => p.estado_pedido !== 'cancelado')
      const totalGastado = pedidosValidos.reduce((s, p) => s + (p.total || 0), 0)
      const ultimaCompra = pedidosUsuario.reduce((max, p) => {
        const f = new Date(p.creado_en)
        return !max || f > max ? f : max
      }, null)
      const diasSinComprar = ultimaCompra ? (ahora - ultimaCompra) / (1000 * 60 * 60 * 24) : null
      const cantidadWishlist = wishlist.filter((w) => w.usuario_id === perfil.id).length

      return {
        perfil,
        pedidosUsuario,
        cantidadPedidos: pedidosUsuario.length,
        totalGastado,
        ultimaCompra,
        ciudad: ciudadMasFrecuente(pedidosUsuario),
        cantidadWishlist,
        esRecurrente: pedidosUsuario.length >= 2,
        sinActividadReciente: diasSinComprar !== null && diasSinComprar > DIAS_SIN_ACTIVIDAD,
      }
    })
  }, [perfiles, pedidos, wishlist])

  const totalGastadoGlobal = useMemo(
    () => filasUsuarios.reduce((s, f) => s + f.totalGastado, 0),
    [filasUsuarios]
  )

  async function alternarSuspendido(perfil) {
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ suspendido: !perfil.suspendido })
        .eq('id', perfil.id)
      if (updateError) throw updateError
      setPerfiles((prev) =>
        prev.map((p) => (p.id === perfil.id ? { ...p, suspendido: !p.suspendido } : p))
      )
    } catch (err) {
      setError('No se pudo actualizar el estado de la cuenta. ' + err.message)
    }
  }

  function abrirHistorial(fila) {
    setHistorial({ open: true, perfil: fila })
  }

  function cerrarHistorial() {
    setHistorial({ open: false, perfil: null })
  }

  return (
    <div>
      <PageHeader title="Usuarios" description="Clientes registrados en el sitio público." />

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total gastado por todos los clientes
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatPrecio(totalGastadoGlobal)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Usuarios registrados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{perfiles.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando usuarios…
        </div>
      ) : filasUsuarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay usuarios registrados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Registrado</th>
                <th className="px-4 py-3">Última compra</th>
                <th className="px-4 py-3">Ciudad / depto. frecuente</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Total gastado</th>
                <th className="px-4 py-3">Wishlist</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cuenta</th>
              </tr>
            </thead>
            <tbody>
              {filasUsuarios.map((fila) => (
                <tr
                  key={fila.perfil.id}
                  onClick={() => abrirHistorial(fila)}
                  className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{fila.perfil.nombre || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-500">{fila.perfil.email || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatFecha(fila.perfil.creado_en)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatFecha(fila.ultimaCompra)}
                    {fila.sinActividadReciente && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Sin actividad reciente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fila.ciudad}</td>
                  <td className="px-4 py-3 text-slate-700">{fila.cantidadPedidos}</td>
                  <td className="px-4 py-3 text-slate-700">{formatPrecio(fila.totalGastado)}</td>
                  <td className="px-4 py-3 text-slate-700">{fila.cantidadWishlist}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        fila.esRecurrente ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {fila.esRecurrente ? 'Cliente recurrente' : 'Cliente nuevo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        alternarSuspendido(fila.perfil)
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        fila.perfil.suspendido
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {fila.perfil.suspendido ? 'Suspendido' : 'Activo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={historial.open}
        title={historial.perfil ? `Historial de ${historial.perfil.perfil.nombre || historial.perfil.perfil.email}` : 'Historial'}
        onClose={cerrarHistorial}
        maxWidth="max-w-2xl"
      >
        {historial.perfil && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{historial.perfil.perfil.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Registrado</dt>
                <dd className="font-medium text-slate-900">{formatFecha(historial.perfil.perfil.creado_en)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Pedidos realizados</dt>
                <dd className="font-medium text-slate-900">{historial.perfil.cantidadPedidos}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total gastado</dt>
                <dd className="font-medium text-slate-900">{formatPrecio(historial.perfil.totalGastado)}</dd>
              </div>
            </dl>

            {historial.perfil.pedidosUsuario.length === 0 ? (
              <p className="text-sm text-slate-500">Este cliente todavía no ha realizado pedidos.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">N° pedido</th>
                      <th className="px-3 py-2">Ciudad</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.perfil.pedidosUsuario
                      .slice()
                      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
                      .map((p) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{p.numero_pedido}</td>
                          <td className="px-3 py-2 text-slate-500">{p.ciudad || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{formatPrecio(p.total)}</td>
                          <td className="px-3 py-2 text-slate-500">{p.estado_pedido}</td>
                          <td className="px-3 py-2 text-slate-500">{formatFecha(p.creado_en)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
