import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const [categoriaModal, setCategoriaModal] = useState({ open: false, categoria: null })
  const [categoriaForm, setCategoriaForm] = useState({ nombre: '', slug: '' })
  const [categoriaSubmitting, setCategoriaSubmitting] = useState(false)
  const [categoriaError, setCategoriaError] = useState('')

  const [subcategoriaModal, setSubcategoriaModal] = useState({
    open: false,
    categoriaId: null,
    subcategoria: null,
  })
  const [subcategoriaForm, setSubcategoriaForm] = useState({ nombre: '', slug: '' })
  const [subcategoriaSubmitting, setSubcategoriaSubmitting] = useState(false)
  const [subcategoriaError, setSubcategoriaError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [categoriasRes, subcategoriasRes] = await Promise.all([
        supabase.from('categorias').select('*').order('orden', { ascending: true }),
        supabase.from('subcategorias').select('*').order('nombre', { ascending: true }),
      ])
      if (categoriasRes.error) throw categoriasRes.error
      if (subcategoriasRes.error) throw subcategoriasRes.error
      setCategorias(categoriasRes.data || [])
      setSubcategorias(subcategoriasRes.data || [])
    } catch (err) {
      setError('No se pudieron cargar las categorías. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function subcategoriasDe(categoriaId) {
    return subcategorias.filter((s) => s.categoria_id === categoriaId)
  }

  function toggleExpand(categoriaId) {
    setExpandedId((current) => (current === categoriaId ? null : categoriaId))
  }

  // ---- Categoría: crear / editar ----

  function openCategoriaModal(categoria = null) {
    setCategoriaError('')
    setCategoriaForm(
      categoria
        ? { nombre: categoria.nombre, slug: categoria.slug, bundle_descuento_x2: categoria.bundle_descuento_x2 ?? 0, bundle_descuento_x3: categoria.bundle_descuento_x3 ?? 0 }
        : { nombre: '', slug: '', bundle_descuento_x2: 0, bundle_descuento_x3: 0 }
    )
    setCategoriaModal({ open: true, categoria })
  }

  function closeCategoriaModal() {
    setCategoriaModal({ open: false, categoria: null })
  }

  function handleNombreChange(value, isEditingSlugManually, setForm) {
    setForm((prev) => ({
      nombre: value,
      slug: isEditingSlugManually ? prev.slug : slugify(value),
    }))
  }

  const [categoriaSlugTouched, setCategoriaSlugTouched] = useState(false)

  async function handleCategoriaSubmit(e) {
    e.preventDefault()
    setCategoriaError('')
    const nombre = categoriaForm.nombre.trim()
    const slug = slugify(categoriaForm.slug)
    if (!nombre || !slug) {
      setCategoriaError('El nombre y el slug son obligatorios.')
      return
    }

    setCategoriaSubmitting(true)
    try {
      const bundlePayload = {
        bundle_descuento_x2: Number(categoriaForm.bundle_descuento_x2) || 0,
        bundle_descuento_x3: Number(categoriaForm.bundle_descuento_x3) || 0,
      }
      if (categoriaModal.categoria) {
        const { error: updateError } = await supabase
          .from('categorias')
          .update({ nombre, slug, ...bundlePayload })
          .eq('id', categoriaModal.categoria.id)
        if (updateError) throw updateError
      } else {
        const siguienteOrden =
          categorias.reduce((max, c) => Math.max(max, c.orden || 0), 0) + 1
        const { error: insertError } = await supabase
          .from('categorias')
          .insert({ nombre, slug, activa: true, orden: siguienteOrden, ...bundlePayload })
        if (insertError) throw insertError
      }
      closeCategoriaModal()
      await loadData()
    } catch (err) {
      setCategoriaError('No se pudo guardar la categoría. ' + err.message)
    } finally {
      setCategoriaSubmitting(false)
    }
  }

  async function toggleCategoriaActiva(categoria) {
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('categorias')
        .update({ activa: !categoria.activa })
        .eq('id', categoria.id)
      if (updateError) throw updateError
      setCategorias((prev) =>
        prev.map((c) => (c.id === categoria.id ? { ...c, activa: !c.activa } : c))
      )
    } catch (err) {
      setError('No se pudo actualizar el estado de la categoría. ' + err.message)
    }
  }

  // ---- Subcategoría: crear / editar / eliminar ----

  function openSubcategoriaModal(categoriaId, subcategoria = null) {
    setSubcategoriaError('')
    setSubcategoriaForm(
      subcategoria
        ? { nombre: subcategoria.nombre, slug: subcategoria.slug }
        : { nombre: '', slug: '' }
    )
    setSubcategoriaModal({ open: true, categoriaId, subcategoria })
  }

  function closeSubcategoriaModal() {
    setSubcategoriaModal({ open: false, categoriaId: null, subcategoria: null })
  }

  async function handleSubcategoriaSubmit(e) {
    e.preventDefault()
    setSubcategoriaError('')
    const nombre = subcategoriaForm.nombre.trim()
    const slug = slugify(subcategoriaForm.slug)
    if (!nombre || !slug) {
      setSubcategoriaError('El nombre y el slug son obligatorios.')
      return
    }

    setSubcategoriaSubmitting(true)
    try {
      if (subcategoriaModal.subcategoria) {
        const { error: updateError } = await supabase
          .from('subcategorias')
          .update({ nombre, slug })
          .eq('id', subcategoriaModal.subcategoria.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('subcategorias')
          .insert({ nombre, slug, categoria_id: subcategoriaModal.categoriaId })
        if (insertError) throw insertError
      }
      closeSubcategoriaModal()
      await loadData()
    } catch (err) {
      setSubcategoriaError('No se pudo guardar la subcategoría. ' + err.message)
    } finally {
      setSubcategoriaSubmitting(false)
    }
  }

  async function handleDeleteSubcategoria(subcategoria) {
    const confirmado = window.confirm(
      `¿Eliminar la subcategoría "${subcategoria.nombre}"? Esta acción no se puede deshacer.`
    )
    if (!confirmado) return

    setError('')
    try {
      const { error: deleteError } = await supabase
        .from('subcategorias')
        .delete()
        .eq('id', subcategoria.id)
      if (deleteError) throw deleteError
      setSubcategorias((prev) => prev.filter((s) => s.id !== subcategoria.id))
    } catch (err) {
      setError('No se pudo eliminar la subcategoría. ' + err.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Crea, edita y activa/desactiva categorías y subcategorías."
        action={
          <button
            type="button"
            onClick={() => openCategoriaModal()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            + Nueva categoría
          </button>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando categorías…
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Aún no hay categorías. Crea la primera con el botón "Nueva categoría".
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Subcategorías</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => {
                const subs = subcategoriasDe(categoria.id)
                const isExpanded = expandedId === categoria.id
                return (
                  <FragmentRow
                    key={categoria.id}
                    categoria={categoria}
                    subs={subs}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpand(categoria.id)}
                    onEditCategoria={() => openCategoriaModal(categoria)}
                    onToggleActiva={() => toggleCategoriaActiva(categoria)}
                    onAddSubcategoria={() => openSubcategoriaModal(categoria.id)}
                    onEditSubcategoria={(sub) => openSubcategoriaModal(categoria.id, sub)}
                    onDeleteSubcategoria={handleDeleteSubcategoria}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={categoriaModal.open}
        title={categoriaModal.categoria ? 'Editar categoría' : 'Nueva categoría'}
        onClose={closeCategoriaModal}
      >
        <form onSubmit={handleCategoriaSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              autoFocus
              required
              value={categoriaForm.nombre}
              onChange={(e) =>
                handleNombreChange(e.target.value, categoriaSlugTouched, setCategoriaForm)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Ej. Accesorios"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
            <input
              required
              value={categoriaForm.slug}
              onChange={(e) => {
                setCategoriaSlugTouched(true)
                setCategoriaForm((prev) => ({ ...prev, slug: e.target.value }))
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="ej-accesorios"
            />
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-orange-800">Descuentos de bundle por categoría</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Dto. bundle x2 (COP/unidad)</label>
                <input
                  type="number"
                  min="0"
                  value={categoriaForm.bundle_descuento_x2}
                  onChange={(e) => setCategoriaForm((prev) => ({ ...prev, bundle_descuento_x2: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. 3000"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Dto. bundle x3 (COP/unidad)</label>
                <input
                  type="number"
                  min="0"
                  value={categoriaForm.bundle_descuento_x3}
                  onChange={(e) => setCategoriaForm((prev) => ({ ...prev, bundle_descuento_x3: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. 5000"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">Aplica cuando el cliente combina productos de distintos modelos de esta categoría. Si lleva el mismo modelo, prevalece el descuento individual del producto.</p>
          </div>

          {categoriaError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{categoriaError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeCategoriaModal}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={categoriaSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {categoriaSubmitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={subcategoriaModal.open}
        title={subcategoriaModal.subcategoria ? 'Editar subcategoría' : 'Nueva subcategoría'}
        onClose={closeSubcategoriaModal}
      >
        <form onSubmit={handleSubcategoriaSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              autoFocus
              required
              value={subcategoriaForm.nombre}
              onChange={(e) => {
                const value = e.target.value
                setSubcategoriaForm((prev) => ({
                  nombre: value,
                  slug: prev.slugTouched ? prev.slug : slugify(value),
                }))
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Ej. Forros"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
            <input
              required
              value={subcategoriaForm.slug}
              onChange={(e) =>
                setSubcategoriaForm((prev) => ({
                  ...prev,
                  slug: e.target.value,
                  slugTouched: true,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="ej-forros"
            />
          </div>

          {subcategoriaError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {subcategoriaError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeSubcategoriaModal}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subcategoriaSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {subcategoriaSubmitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function FragmentRow({
  categoria,
  subs,
  isExpanded,
  onToggleExpand,
  onEditCategoria,
  onToggleActiva,
  onAddSubcategoria,
  onEditSubcategoria,
  onDeleteSubcategoria,
}) {
  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="px-4 py-3 align-top">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100"
            aria-label={isExpanded ? 'Contraer' : 'Expandir'}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        </td>
        <td className="px-4 py-3 font-medium text-slate-900">{categoria.nombre}</td>
        <td className="px-4 py-3 text-slate-500">{categoria.slug}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggleActiva}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              categoria.activa
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {categoria.activa ? 'Activa' : 'Inactiva'}
          </button>
        </td>
        <td className="px-4 py-3 text-slate-500">{subs.length}</td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onEditCategoria}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Editar
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td />
          <td colSpan={5} className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Subcategorías de {categoria.nombre}
              </p>
              <button
                type="button"
                onClick={onAddSubcategoria}
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
              >
                + Subcategoría
              </button>
            </div>

            {subs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-400">
                Sin subcategorías todavía.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {subs.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{sub.nombre}</p>
                      <p className="text-xs text-slate-500">{sub.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditSubcategoria(sub)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSubcategoria(sub)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
