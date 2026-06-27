import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', clase: 'bg-amber-50 text-amber-700' },
  { value: 'aprobada', label: 'Aprobada', clase: 'bg-green-50 text-green-700' },
  { value: 'rechazada', label: 'Rechazada', clase: 'bg-red-50 text-red-700' },
]

function badgeEstado(estado) {
  const info = ESTADOS.find((e) => e.value === estado)
  return info || { label: estado, clase: 'bg-slate-100 text-slate-600' }
}

function Estrellas({ calificacion }) {
  return (
    <span className="text-amber-500" aria-label={`${calificacion} de 5 estrellas`}>
      {'★'.repeat(calificacion)}
      <span className="text-slate-300">{'★'.repeat(5 - calificacion)}</span>
    </span>
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

function isoParaInputLocal(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Resenas() {
  const [resenas, setResenas] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('pendiente')
  const [fechaEdits, setFechaEdits] = useState({})
  const [guardandoFechaId, setGuardandoFechaId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [resenasRes, productosRes] = await Promise.all([
        supabase.from('resenas').select('*').order('creado_en', { ascending: false }),
        supabase.from('productos').select('id, nombre'),
      ])
      if (resenasRes.error) throw resenasRes.error
      if (productosRes.error) throw productosRes.error
      setResenas(resenasRes.data || [])
      setProductos(productosRes.data || [])
    } catch (err) {
      setError('No se pudieron cargar las reseñas. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const productoPorId = useMemo(() => {
    const mapa = {}
    for (const p of productos) mapa[p.id] = p
    return mapa
  }, [productos])

  const resenasFiltradas = useMemo(() => {
    if (filtro === 'todas') return resenas
    return resenas.filter((r) => r.estado === filtro)
  }, [resenas, filtro])

  async function cambiarEstado(resena, nuevoEstado) {
    if (nuevoEstado === resena.estado) return
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('resenas')
        .update({ estado: nuevoEstado })
        .eq('id', resena.id)
      if (updateError) throw updateError
      setResenas((prev) =>
        prev.map((r) => (r.id === resena.id ? { ...r, estado: nuevoEstado, aprobada: nuevoEstado === 'aprobada' } : r))
      )
    } catch (err) {
      setError('No se pudo cambiar el estado de la reseña. ' + err.message)
    }
  }

  async function guardarFecha(resena) {
    const valor = fechaEdits[resena.id]
    if (!valor) return
    const nuevaFecha = new Date(valor)
    if (Number.isNaN(nuevaFecha.getTime())) {
      setError('La fecha ingresada no es válida.')
      return
    }
    setError('')
    setGuardandoFechaId(resena.id)
    try {
      const nuevoIso = nuevaFecha.toISOString()
      const { error: updateError } = await supabase
        .from('resenas')
        .update({ creado_en: nuevoIso })
        .eq('id', resena.id)
      if (updateError) throw updateError
      setResenas((prev) =>
        prev.map((r) => (r.id === resena.id ? { ...r, creado_en: nuevoIso } : r))
      )
    } catch (err) {
      setError('No se pudo actualizar la fecha de la reseña. ' + err.message)
    } finally {
      setGuardandoFechaId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Reseñas"
        description="Revisa reseñas pendientes y apruébalas o recházalas."
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Mostrar:</label>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="pendiente">Pendientes</option>
          <option value="aprobada">Aprobadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando reseñas…
        </div>
      ) : resenasFiltradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay reseñas para mostrar.
        </div>
      ) : (
        <div className="space-y-3">
          {resenasFiltradas.map((resena) => {
            const producto = productoPorId[resena.producto_id]
            const estado = badgeEstado(resena.estado)
            return (
              <div key={resena.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{resena.nombre_cliente}</p>
                    <p className="text-xs text-slate-500">
                      {resena.ciudad || 'Ciudad no indicada'} · {formatFecha(resena.creado_en)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estado.clase}`}>
                    {estado.label}
                  </span>
                </div>

                <Estrellas calificacion={resena.calificacion} />

                <p className="mt-2 text-sm text-slate-700">{resena.comentario}</p>

                <p className="mt-2 text-xs text-slate-500">
                  Producto: {producto?.nombre || 'Sin producto asociado'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="text-xs font-medium text-slate-600" htmlFor={`fecha-${resena.id}`}>
                    Fecha mostrada:
                  </label>
                  <input
                    id={`fecha-${resena.id}`}
                    type="datetime-local"
                    value={fechaEdits[resena.id] ?? isoParaInputLocal(resena.creado_en)}
                    onChange={(e) =>
                      setFechaEdits((prev) => ({ ...prev, [resena.id]: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    disabled={guardandoFechaId === resena.id}
                    onClick={() => guardarFecha(resena)}
                    className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-default disabled:opacity-50"
                  >
                    {guardandoFechaId === resena.id ? 'Guardando…' : 'Guardar fecha'}
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  {ESTADOS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.value === resena.estado}
                      onClick={() => cambiarEstado(resena, opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        opt.value === resena.estado
                          ? 'cursor-default border-slate-200 bg-slate-100 text-slate-400'
                          : opt.value === 'aprobada'
                            ? 'border-green-200 text-green-700 hover:bg-green-50'
                            : opt.value === 'rechazada'
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.value === 'pendiente'
                        ? 'Volver a pendiente'
                        : opt.value === 'aprobada'
                          ? 'Aprobar'
                          : 'Rechazar'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
