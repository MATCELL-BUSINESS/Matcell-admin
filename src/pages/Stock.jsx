import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'

// ---- helpers ----

function descripcionVariante(v) {
  const partes = []
  if (v.almacenamiento) partes.push(v.almacenamiento)
  if (v.modelo_compatible) partes.push(v.modelo_compatible)
  if (v.color) partes.push(v.color)
  return partes.join(' · ') || 'Sin descripción'
}

function Toast({ mensaje, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-lg">
      <span>✓</span> {mensaje}
    </div>
  )
}

// ---- component ----

export default function Stock() {
  const [variantes, setVariantes] = useState([])        // [{...variante, producto}]
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [fotosPorProducto, setFotosPorProducto] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Map<varianteId, string> de lo que el admin escribe en "Nuevo stock"
  const [nuevosStocks, setNuevosStocks] = useState({})
  // Map<varianteId, string> mensajes de error por fila
  const [erroresFila, setErroresFila] = useState({})
  // Set de varianteIds guardando en este momento
  const [guardando, setGuardando] = useState(new Set())
  const [guardandoTodo, setGuardandoTodo] = useState(false)
  const [toast, setToast] = useState(null)          // null | string
  const toastKey = useRef(0)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [varRes, prodRes, catRes, subRes, fotosRes] = await Promise.all([
        supabase
          .from('producto_variantes')
          .select('*')
          .order('color', { ascending: true }),
        supabase
          .from('productos')
          .select('id, nombre, categoria_id, subcategoria_id')
          .eq('activo', true),
        supabase.from('categorias').select('*').order('orden', { ascending: true }),
        supabase.from('subcategorias').select('*').order('nombre', { ascending: true }),
        supabase.from('producto_fotos').select('producto_id, url').order('orden', { ascending: true }),
      ])
      if (varRes.error) throw varRes.error
      if (prodRes.error) throw prodRes.error
      if (catRes.error) throw catRes.error
      if (subRes.error) throw subRes.error
      if (fotosRes.error) throw fotosRes.error

      const prodPorId = {}
      for (const p of prodRes.data || []) prodPorId[p.id] = p

      const fotasPrimera = {}
      for (const f of fotosRes.data || []) {
        if (!fotasPrimera[f.producto_id]) fotasPrimera[f.producto_id] = f.url
      }

      const filas = (varRes.data || [])
        .map((v) => ({ ...v, producto: prodPorId[v.producto_id] || null }))
        .filter((v) => v.producto !== null)

      setVariantes(filas)
      setCategorias(catRes.data || [])
      setSubcategorias(subRes.data || [])
      setFotosPorProducto(fotasPrimera)
    } catch (err) {
      setError('No se pudieron cargar las variantes. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ---- filtrado y agrupado ----

  const subcategoriasFiltro = useMemo(
    () => subcategorias.filter((s) => !filtroCategoria || s.categoria_id === filtroCategoria),
    [subcategorias, filtroCategoria]
  )

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return variantes.filter((v) => {
      if (filtroCategoria && v.producto?.categoria_id !== filtroCategoria) return false
      if (filtroSubcategoria && v.producto?.subcategoria_id !== filtroSubcategoria) return false
      if (q && !v.producto?.nombre.toLowerCase().includes(q)) return false
      return true
    })
  }, [variantes, filtroCategoria, filtroSubcategoria, busqueda])

  // Ordenar: categoría → nombre producto → descripción variante
  const filasOrdenadas = useMemo(() => {
    const catOrden = {}
    for (const c of categorias) catOrden[c.id] = c.orden ?? 999
    return [...filasFiltradas].sort((a, b) => {
      const ca = catOrden[a.producto?.categoria_id] ?? 999
      const cb = catOrden[b.producto?.categoria_id] ?? 999
      if (ca !== cb) return ca - cb
      const na = a.producto?.nombre || ''
      const nb = b.producto?.nombre || ''
      if (na !== nb) return na.localeCompare(nb, 'es')
      return descripcionVariante(a).localeCompare(descripcionVariante(b), 'es')
    })
  }, [filasFiltradas, categorias])

  // ---- acciones ----

  function mostrarToast(msg) {
    toastKey.current += 1
    setToast({ msg, key: toastKey.current })
  }

  function validarStock(valor) {
    const n = parseInt(valor, 10)
    if (isNaN(n)) return { ok: false, msg: 'Ingresa un número válido.' }
    if (n < 0) return { ok: false, msg: 'El stock no puede ser negativo.' }
    return { ok: true, valor: n }
  }

  async function guardarFila(varianteId) {
    const raw = nuevosStocks[varianteId]
    if (raw === '' || raw === undefined) return

    const { ok, msg, valor } = validarStock(raw)
    if (!ok) {
      setErroresFila((prev) => ({ ...prev, [varianteId]: msg }))
      return
    }

    setGuardando((prev) => new Set(prev).add(varianteId))
    setErroresFila((prev) => { const n = { ...prev }; delete n[varianteId]; return n })

    try {
      const { error: updateError } = await supabase
        .from('producto_variantes')
        .update({ stock: valor })
        .eq('id', varianteId)
      if (updateError) throw updateError

      setVariantes((prev) =>
        prev.map((v) => (v.id === varianteId ? { ...v, stock: valor } : v))
      )
      setNuevosStocks((prev) => { const n = { ...prev }; delete n[varianteId]; return n })
      mostrarToast('Stock actualizado.')
    } catch (err) {
      setErroresFila((prev) => ({ ...prev, [varianteId]: err.message }))
    } finally {
      setGuardando((prev) => { const s = new Set(prev); s.delete(varianteId); return s })
    }
  }

  const guardarTodo = useCallback(async () => {
    const pendientes = Object.entries(nuevosStocks).filter(([, v]) => v !== '')
    if (pendientes.length === 0) return

    // Validar todo primero
    const errores = {}
    const validos = []
    for (const [id, raw] of pendientes) {
      const { ok, msg, valor } = validarStock(raw)
      if (!ok) errores[id] = msg
      else validos.push({ id, valor })
    }
    if (Object.keys(errores).length > 0) {
      setErroresFila((prev) => ({ ...prev, ...errores }))
      return
    }

    setGuardandoTodo(true)
    const nuevosErrores = {}
    const actualizados = []

    await Promise.all(
      validos.map(async ({ id, valor }) => {
        try {
          const { error: updateError } = await supabase
            .from('producto_variantes')
            .update({ stock: valor })
            .eq('id', id)
          if (updateError) throw updateError
          actualizados.push({ id, valor })
        } catch (err) {
          nuevosErrores[id] = err.message
        }
      })
    )

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresFila((prev) => ({ ...prev, ...nuevosErrores }))
    }

    if (actualizados.length > 0) {
      setVariantes((prev) =>
        prev.map((v) => {
          const hit = actualizados.find((a) => a.id === v.id)
          return hit ? { ...v, stock: hit.valor } : v
        })
      )
      setNuevosStocks((prev) => {
        const n = { ...prev }
        for (const { id } of actualizados) delete n[id]
        return n
      })
      mostrarToast(`${actualizados.length} variante${actualizados.length > 1 ? 's' : ''} actualizada${actualizados.length > 1 ? 's' : ''}.`)
    }

    setGuardandoTodo(false)
  }, [nuevosStocks])

  const filasConPendiente = Object.values(nuevosStocks).filter((v) => v !== '').length

  // ---- render ----

  // Detectar cambios de grupo (producto) para separadores visuales
  function esNuevoProducto(idx) {
    if (idx === 0) return true
    return filasOrdenadas[idx].producto_id !== filasOrdenadas[idx - 1].producto_id
  }

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Actualiza el stock de cada variante sin entrar a editar el producto."
        action={
          <button
            type="button"
            onClick={guardarTodo}
            disabled={guardandoTodo || filasConPendiente === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {guardandoTodo
              ? 'Guardando…'
              : filasConPendiente > 0
                ? `Guardar todo (${filasConPendiente})`
                : 'Guardar todo'}
          </button>
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar producto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => { setFiltroCategoria(e.target.value); setFiltroSubcategoria('') }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {subcategoriasFiltro.length > 0 && (
          <select
            value={filtroSubcategoria}
            onChange={(e) => setFiltroSubcategoria(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Todas las subcategorías</option>
            {subcategoriasFiltro.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando variantes…
        </div>
      ) : filasOrdenadas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay variantes que coincidan con el filtro.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="hidden px-4 py-3 sm:table-cell">Foto</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Variante</th>
                <th className="px-4 py-3">Stock actual</th>
                <th className="px-4 py-3">Nuevo stock</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filasOrdenadas.map((v, idx) => {
                const cambioGrupo = esNuevoProducto(idx)
                const foto = fotosPorProducto[v.producto_id]
                const pendiente = guardando.has(v.id)
                const errorFila = erroresFila[v.id]
                const valorInput = nuevosStocks[v.id] ?? ''

                return (
                  <tr
                    key={v.id}
                    className={`border-t ${cambioGrupo && idx > 0 ? 'border-slate-300' : 'border-slate-100'}`}
                  >
                    {/* Foto — oculta en móvil */}
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      {foto ? (
                        <img
                          src={foto}
                          alt=""
                          className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                          —
                        </div>
                      )}
                    </td>

                    {/* Nombre producto */}
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{v.producto?.nombre}</p>
                    </td>

                    {/* Variante */}
                    <td className="px-4 py-2.5 text-slate-600">
                      <div className="flex items-center gap-2">
                        {v.color_hex && (
                          <span
                            className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                            style={{ backgroundColor: v.color_hex }}
                          />
                        )}
                        {descripcionVariante(v)}
                      </div>
                    </td>

                    {/* Stock actual */}
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-slate-500">{v.stock}</span>
                    </td>

                    {/* Nuevo stock */}
                    <td className="px-4 py-2.5">
                      <div>
                        <input
                          type="number"
                          min="0"
                          placeholder="—"
                          value={valorInput}
                          onChange={(e) => {
                            const val = e.target.value
                            setNuevosStocks((prev) => ({ ...prev, [v.id]: val }))
                            if (erroresFila[v.id]) {
                              setErroresFila((prev) => { const n = { ...prev }; delete n[v.id]; return n })
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') guardarFila(v.id)
                          }}
                          className={`w-24 rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 ${
                            errorFila
                              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
                          }`}
                        />
                        {errorFila && (
                          <p className="mt-1 text-xs text-red-600">{errorFila}</p>
                        )}
                      </div>
                    </td>

                    {/* Botón guardar individual */}
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        disabled={pendiente || valorInput === ''}
                        onClick={() => guardarFila(v.id)}
                        className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-default disabled:opacity-40"
                      >
                        {pendiente ? '…' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast de éxito */}
      {toast && (
        <Toast
          key={toast.key}
          mensaje={toast.msg}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}
