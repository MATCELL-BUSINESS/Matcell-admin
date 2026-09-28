import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'

const MOTIVOS = [
  'Venta local',
  'Venta WhatsApp/Instagram',
  'Entrada de inventario',
  'Producto dañado',
  'Ajuste de conteo',
  'Otro',
]

const ORIGENES = {
  ajuste_manual: 'Ajuste manual',
  venta_web: 'Venta web',
}

const POR_PAGINA = 25

function formatFecha(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default function Historial() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [pagina, setPagina] = useState(0)

  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroMotivo, setFiltroMotivo] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let q = supabase
        .from('inventario_movimientos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1)

      if (filtroBusqueda.trim()) {
        q = q.ilike('producto_nombre', `%${filtroBusqueda.trim()}%`)
      }
      if (filtroMotivo) {
        q = q.eq('motivo', filtroMotivo)
      }
      if (filtroDesde) {
        q = q.gte('created_at', new Date(filtroDesde).toISOString())
      }
      if (filtroHasta) {
        const hasta = new Date(filtroHasta)
        hasta.setHours(23, 59, 59, 999)
        q = q.lte('created_at', hasta.toISOString())
      }

      const { data, error: err, count } = await q
      if (err) throw err
      setMovimientos(data ?? [])
      setTotalCount(count ?? 0)
    } catch (err) {
      setError('No se pudo cargar el historial. ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [pagina, filtroBusqueda, filtroMotivo, filtroDesde, filtroHasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  function aplicarFiltros() {
    setPagina(0)
    cargar()
  }

  const totalPaginas = Math.ceil(totalCount / POR_PAGINA)

  return (
    <div>
      <PageHeader
        title="Historial de inventario"
        description="Registro de todos los movimientos de stock."
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar producto…"
          value={filtroBusqueda}
          onChange={(e) => { setFiltroBusqueda(e.target.value); setPagina(0) }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={filtroMotivo}
          onChange={(e) => { setFiltroMotivo(e.target.value); setPagina(0) }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todos los motivos</option>
          {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value="venta_web">Venta web</option>
        </select>
        <input
          type="date"
          value={filtroDesde}
          onChange={(e) => { setFiltroDesde(e.target.value); setPagina(0) }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <input
          type="date"
          value={filtroHasta}
          onChange={(e) => { setFiltroHasta(e.target.value); setPagina(0) }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {(filtroBusqueda || filtroMotivo || filtroDesde || filtroHasta) && (
          <button
            type="button"
            onClick={() => { setFiltroBusqueda(''); setFiltroMotivo(''); setFiltroDesde(''); setFiltroHasta(''); setPagina(0) }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando historial…
        </div>
      ) : movimientos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay movimientos registrados.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Producto — Variante</th>
                  <th className="px-4 py-3">Movimiento</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Origen</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, idx) => (
                  <tr key={m.id} className={`border-t border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {formatFecha(m.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{m.producto_nombre ?? '—'}</p>
                      {m.variante_descripcion && (
                        <p className="text-xs text-slate-500">{m.variante_descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      <span className="text-slate-600">{m.stock_anterior ?? '—'} → {m.stock_nuevo ?? '—'}</span>
                      {' '}
                      <span className={`text-xs font-semibold ${(m.diferencia ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(m.diferencia ?? 0) >= 0 ? '+' : ''}{m.diferencia ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{m.motivo ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {ORIGENES[m.origen] ?? m.origen ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>{totalCount} movimientos en total</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagina === 0}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
                >
                  ← Anterior
                </button>
                <span className="px-2 py-1.5">
                  {pagina + 1} / {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={pagina >= totalPaginas - 1}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
