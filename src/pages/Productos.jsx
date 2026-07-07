import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const ESTADOS = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'seminuevo', label: 'Seminuevo' },
]

const GRADOS = ['A', 'B', 'C']

// Solo estas categorías muestran specs de celular y permiten "seminuevo".
const SLUGS_CELULAR = ['iphone', 'android', 'ipad-mac']
const SLUG_ACCESORIOS = 'accesorios'

const FORM_VACIO = {
  categoria_id: '',
  subcategoria_id: '',
  nombre: '',
  estado: 'nuevo',
  grado_interno: '',
  precio: '',
  precio_anterior: '',
  en_oferta: false,
  almacenamiento: '',
  pantalla: '',
  procesador: '',
  camara: '',
  material: '',
  descripcion: '',
  incluye_regalo: false,
  destacado: false,
  caracteristicas: [],
}

function formatPrecio(valor) {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    valor
  )
}

// Los precios en COP son siempre enteros (sin centavos). Guardamos en el
// formulario solo los dígitos que el usuario escribió (string), y formateamos
// con separador de miles únicamente para mostrarlos — nunca se multiplica,
// divide ni se pasa por parseFloat, así se evita el error de redondeo de punto flotante.
function soloDigitos(valor) {
  return valor.replace(/[^0-9]/g, '')
}

function formatMiles(digitos) {
  if (!digitos) return ''
  return new Intl.NumberFormat('es-CO').format(parseInt(digitos, 10))
}

function extraerRutaStorage(url) {
  const marcador = '/storage/v1/object/public/productos/'
  const idx = url.indexOf(marcador)
  return idx === -1 ? null : url.slice(idx + marcador.length)
}

function listaDesdeTexto(texto) {
  return texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export default function Productos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [fotosPorProducto, setFotosPorProducto] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('')

  const [modal, setModal] = useState({ open: false, producto: null })
  const [form, setForm] = useState(FORM_VACIO)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [productoIdActivo, setProductoIdActivo] = useState(null)
  const [fotosActivo, setFotosActivo] = useState([])
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  const BUNDLE_VACIO = {
    bundle_2_activo: false, bundle_2_tipo: 'porcentaje', bundle_2_descuento: '',
    bundle_3_activo: false, bundle_3_tipo: 'porcentaje', bundle_3_descuento: '',
  }
  const [bundleForm, setBundleForm] = useState(BUNDLE_VACIO)
  const [bundleId, setBundleId] = useState(null)
  const [guardandoBundle, setGuardandoBundle] = useState(false)

  const [variantesActivo, setVariantesActivo] = useState([])
  const [nuevaVariante, setNuevaVariante] = useState({
    modelo_compatible: '',
    color: '',
    color_hex: '#000000',
    almacenamiento: '',
    precio: '',
    stock: '0',
  })
  const [variantesBulk, setVariantesBulk] = useState({ modelos: '', colores: '' })
  const [colorFotoNueva, setColorFotoNueva] = useState('')
  const [caracteristicaInput, setCaracteristicaInput] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  // Permite enlazar directo a "editar este producto" (ej. desde las alertas
  // de stock bajo del dashboard) vía /productos?id=<uuid>.
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || productos.length === 0) return
    const producto = productos.find((p) => p.id === id)
    if (producto) {
      abrirModalEditar(producto)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [productosRes, categoriasRes, subcategoriasRes, fotosRes] = await Promise.all([
        supabase.from('productos').select('*').order('creado_en', { ascending: false }),
        supabase.from('categorias').select('*').order('orden', { ascending: true }),
        supabase.from('subcategorias').select('*').order('nombre', { ascending: true }),
        supabase.from('producto_fotos').select('*').order('orden', { ascending: true }),
      ])
      if (productosRes.error) throw productosRes.error
      if (categoriasRes.error) throw categoriasRes.error
      if (subcategoriasRes.error) throw subcategoriasRes.error
      if (fotosRes.error) throw fotosRes.error

      setProductos(productosRes.data || [])
      setCategorias(categoriasRes.data || [])
      setSubcategorias(subcategoriasRes.data || [])

      const agrupadas = {}
      for (const foto of fotosRes.data || []) {
        if (!agrupadas[foto.producto_id]) agrupadas[foto.producto_id] = []
        agrupadas[foto.producto_id].push(foto)
      }
      setFotosPorProducto(agrupadas)
    } catch (err) {
      setError('No se pudieron cargar los productos. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const categoriaPorId = useMemo(() => {
    const mapa = {}
    for (const c of categorias) mapa[c.id] = c
    return mapa
  }, [categorias])

  const subcategoriasDeForm = useMemo(
    () => subcategorias.filter((s) => s.categoria_id === form.categoria_id),
    [subcategorias, form.categoria_id]
  )

  const productosFiltrados = useMemo(() => {
    if (!filtroCategoriaId) return productos
    return productos.filter((p) => p.categoria_id === filtroCategoriaId)
  }, [productos, filtroCategoriaId])

  const categoriaFormSlug = categoriaPorId[form.categoria_id]?.slug
  const esCelular = SLUGS_CELULAR.includes(categoriaFormSlug)
  const esAccesorios = categoriaFormSlug === SLUG_ACCESORIOS
  const permiteSeminuevo = categoriaFormSlug === 'iphone'

  // ---- Crear / editar producto ----

  function abrirModalNuevo() {
    setFormError('')
    setForm(FORM_VACIO)
    setProductoIdActivo(null)
    setFotosActivo([])
    setVariantesActivo([])
    setNuevaVariante({ modelo_compatible: '', color: '', color_hex: '#000000', almacenamiento: '', precio: '', stock: '0' })
    setVariantesBulk({ modelos: '', colores: '' })
    setColorFotoNueva('')
    setCaracteristicaInput('')
    setBundleForm(BUNDLE_VACIO)
    setBundleId(null)
    setModal({ open: true, producto: null })
  }

  async function abrirModalEditar(producto) {
    setFormError('')
    setForm({
      categoria_id: producto.categoria_id || '',
      subcategoria_id: producto.subcategoria_id || '',
      nombre: producto.nombre || '',
      estado: producto.estado || 'nuevo',
      grado_interno: producto.grado_interno || '',
      precio: producto.precio != null ? String(Math.round(producto.precio)) : '',
      precio_anterior:
        producto.precio_anterior != null ? String(Math.round(producto.precio_anterior)) : '',
      en_oferta: !!producto.en_oferta,
      almacenamiento: producto.almacenamiento || '',
      pantalla: producto.pantalla || '',
      procesador: producto.procesador || '',
      camara: producto.camara || '',
      material: producto.material || '',
      descripcion: producto.descripcion || '',
      incluye_regalo: !!producto.incluye_regalo,
      destacado: !!producto.destacado,
      caracteristicas: producto.caracteristicas || [],
    })
    setProductoIdActivo(producto.id)
    setFotosActivo(fotosPorProducto[producto.id] || [])
    setCaracteristicaInput('')
    setVariantesBulk({ modelos: '', colores: '' })
    setColorFotoNueva('')
    setBundleForm(BUNDLE_VACIO)
    setBundleId(null)
    setModal({ open: true, producto })
    await Promise.all([cargarVariantes(producto.id), cargarBundle(producto.id)])
  }

  function cerrarModal() {
    setModal({ open: false, producto: null })
    setProductoIdActivo(null)
    setFotosActivo([])
    setVariantesActivo([])
    setBundleForm(BUNDLE_VACIO)
    setBundleId(null)
  }

  function actualizarCampo(campo, valor) {
    setForm((prev) => {
      const siguiente = { ...prev, [campo]: valor }
      if (campo === 'categoria_id') {
        siguiente.subcategoria_id = ''
        const slug = categoriaPorId[valor]?.slug
        if (slug !== 'iphone') siguiente.estado = 'nuevo'
      }
      return siguiente
    })
  }

  function actualizarPrecio(campo, valorInput) {
    actualizarCampo(campo, soloDigitos(valorInput))
  }

  function validarForm() {
    if (!form.categoria_id) return 'Selecciona una categoría.'
    if (!form.nombre.trim()) return 'El nombre es obligatorio.'
    if (form.precio === '') return 'El precio es obligatorio.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const mensaje = validarForm()
    if (mensaje) {
      setFormError(mensaje)
      return
    }
    setFormError('')
    setSubmitting(true)

    const payload = {
      categoria_id: form.categoria_id,
      subcategoria_id: form.subcategoria_id || null,
      nombre: form.nombre.trim(),
      estado: permiteSeminuevo ? form.estado : 'nuevo',
      grado_interno: esCelular ? form.grado_interno || null : null,
      precio: parseInt(form.precio, 10),
      precio_anterior: form.precio_anterior === '' ? null : parseInt(form.precio_anterior, 10),
      en_oferta: form.en_oferta,
      almacenamiento: esCelular ? form.almacenamiento || null : null,
      pantalla: esCelular ? form.pantalla || null : null,
      procesador: esCelular ? form.procesador || null : null,
      camara: esCelular ? form.camara || null : null,
      material: esCelular ? form.material || null : null,
      descripcion: form.descripcion || null,
      incluye_regalo: form.incluye_regalo,
      destacado: form.destacado,
      caracteristicas: esAccesorios ? form.caracteristicas : [],
    }

    try {
      if (modal.producto) {
        const { error: updateError } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', modal.producto.id)
        if (updateError) throw updateError
        await loadData()
      } else {
        const { data, error: insertError } = await supabase
          .from('productos')
          .insert({ ...payload, activo: true })
          .select()
          .single()
        if (insertError) throw insertError
        await loadData()
        // Mantenemos el modal abierto para permitir subir fotos y variantes del producto recién creado.
        setProductoIdActivo(data.id)
        setModal({ open: true, producto: data })
      }
    } catch (err) {
      setFormError('No se pudo guardar el producto. ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActivo(producto) {
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('productos')
        .update({ activo: !producto.activo })
        .eq('id', producto.id)
      if (updateError) throw updateError
      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, activo: !p.activo } : p))
      )
    } catch (err) {
      setError('No se pudo actualizar el estado del producto. ' + err.message)
    }
  }

  // ---- Características (solo Accesorios) ----

  function agregarCaracteristica() {
    const texto = caracteristicaInput.trim()
    if (!texto) return
    setForm((prev) => ({ ...prev, caracteristicas: [...prev.caracteristicas, texto] }))
    setCaracteristicaInput('')
  }

  function eliminarCaracteristica(indice) {
    setForm((prev) => ({
      ...prev,
      caracteristicas: prev.caracteristicas.filter((_, i) => i !== indice),
    }))
  }

  // ---- Bundle (solo accesorios) ----

  async function cargarBundle(productoId) {
    try {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('producto_id', productoId)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setBundleId(data.id)
        setBundleForm({
          bundle_2_activo: data.bundle_2_activo ?? false,
          bundle_2_tipo: data.bundle_2_tipo ?? 'porcentaje',
          bundle_2_descuento: data.bundle_2_descuento != null ? String(data.bundle_2_descuento) : '',
          bundle_3_activo: data.bundle_3_activo ?? false,
          bundle_3_tipo: data.bundle_3_tipo ?? 'porcentaje',
          bundle_3_descuento: data.bundle_3_descuento != null ? String(data.bundle_3_descuento) : '',
        })
      }
    } catch (err) {
      setFormError('No se pudo cargar el bundle. ' + err.message)
    }
  }

  async function guardarBundle() {
    if (!productoIdActivo) return
    setGuardandoBundle(true)
    setFormError('')
    try {
      const payload = {
        producto_id: productoIdActivo,
        activo: true,
        bundle_2_activo: bundleForm.bundle_2_activo,
        bundle_2_tipo: bundleForm.bundle_2_activo ? bundleForm.bundle_2_tipo : null,
        bundle_2_descuento: bundleForm.bundle_2_activo && bundleForm.bundle_2_descuento !== '' ? parseFloat(bundleForm.bundle_2_descuento) : null,
        bundle_3_activo: bundleForm.bundle_3_activo,
        bundle_3_tipo: bundleForm.bundle_3_activo ? bundleForm.bundle_3_tipo : null,
        bundle_3_descuento: bundleForm.bundle_3_activo && bundleForm.bundle_3_descuento !== '' ? parseFloat(bundleForm.bundle_3_descuento) : null,
      }
      if (bundleId) {
        const { error } = await supabase.from('bundles').update(payload).eq('id', bundleId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('bundles').insert(payload).select('id').single()
        if (error) throw error
        setBundleId(data.id)
      }
    } catch (err) {
      setFormError('No se pudo guardar el bundle. ' + err.message)
    } finally {
      setGuardandoBundle(false)
    }
  }

  // ---- Variantes (color + stock, y modelo compatible para accesorios) ----

  async function cargarVariantes(productoId) {
    try {
      const { data, error: variantesError } = await supabase
        .from('producto_variantes')
        .select('*')
        .eq('producto_id', productoId)
        .order('color', { ascending: true })
      if (variantesError) throw variantesError
      setVariantesActivo(data || [])
    } catch (err) {
      setFormError('No se pudieron cargar las variantes. ' + err.message)
    }
  }

  function actualizarStockLocalProducto(productoId, variantes) {
    const total = variantes.reduce((sum, v) => sum + (v.stock || 0), 0)
    setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, stock: total } : p)))
  }

  async function agregarVariante() {
    if (!productoIdActivo) return
    const color = nuevaVariante.color.trim()
    if (!color) {
      setFormError('El color de la variante es obligatorio.')
      return
    }

    setFormError('')
    try {
      const { data, error: insertError } = await supabase
        .from('producto_variantes')
        .insert({
          producto_id: productoIdActivo,
          modelo_compatible: esAccesorios && nuevaVariante.modelo_compatible.trim() ? nuevaVariante.modelo_compatible.trim() : null,
          color,
          color_hex: nuevaVariante.color_hex || null,
          almacenamiento: nuevaVariante.almacenamiento.trim() || null,
          precio: nuevaVariante.precio.trim() ? parseInt(nuevaVariante.precio.trim(), 10) : null,
          stock: parseInt(nuevaVariante.stock || '0', 10),
        })
        .select()
        .single()
      if (insertError) throw insertError

      const siguientes = [...variantesActivo, data]
      setVariantesActivo(siguientes)
      actualizarStockLocalProducto(productoIdActivo, siguientes)
      setNuevaVariante({ modelo_compatible: '', color: '', color_hex: '#000000', almacenamiento: '', precio: '', stock: '0' })
    } catch (err) {
      setFormError('No se pudo agregar la variante. ' + err.message)
    }
  }

  async function generarCombinaciones() {
    if (!productoIdActivo) return
    const modelos = listaDesdeTexto(variantesBulk.modelos)
    const colores = listaDesdeTexto(variantesBulk.colores)
    if (modelos.length === 0 || colores.length === 0) {
      setFormError('Escribe al menos un modelo y un color separados por comas.')
      return
    }

    setFormError('')
    try {
      const filas = modelos.flatMap((modelo) =>
        colores.map((color) => ({
          producto_id: productoIdActivo,
          modelo_compatible: modelo,
          color,
          stock: 0,
        }))
      )
      const { data, error: insertError } = await supabase.from('producto_variantes').insert(filas).select()
      if (insertError) throw insertError

      const siguientes = [...variantesActivo, ...(data || [])]
      setVariantesActivo(siguientes)
      actualizarStockLocalProducto(productoIdActivo, siguientes)
      setVariantesBulk({ modelos: '', colores: '' })
    } catch (err) {
      setFormError('No se pudieron generar las combinaciones. ' + err.message)
    }
  }

  async function actualizarVariante(variante, campo, valor) {
    const valorFinal =
      campo === 'stock'
        ? parseInt(valor || '0', 10)
        : campo === 'precio'
          ? valor === '' || valor === null ? null : parseInt(valor, 10)
          : valor
    setVariantesActivo((prev) =>
      prev.map((v) => (v.id === variante.id ? { ...v, [campo]: valorFinal } : v))
    )

    try {
      const { error: updateError } = await supabase
        .from('producto_variantes')
        .update({ [campo]: valorFinal })
        .eq('id', variante.id)
      if (updateError) throw updateError
      if (campo === 'stock') {
        const siguientes = variantesActivo.map((v) =>
          v.id === variante.id ? { ...v, stock: valorFinal } : v
        )
        actualizarStockLocalProducto(productoIdActivo, siguientes)
      }
    } catch (err) {
      setFormError('No se pudo actualizar la variante. ' + err.message)
    }
  }

  async function eliminarVariante(variante) {
    const confirmado = window.confirm('¿Eliminar esta variante?')
    if (!confirmado) return

    setFormError('')
    try {
      const { error: deleteError } = await supabase.from('producto_variantes').delete().eq('id', variante.id)
      if (deleteError) throw deleteError

      const siguientes = variantesActivo.filter((v) => v.id !== variante.id)
      setVariantesActivo(siguientes)
      actualizarStockLocalProducto(productoIdActivo, siguientes)
    } catch (err) {
      setFormError('No se pudo eliminar la variante. ' + err.message)
    }
  }

  // ---- Fotos ----

  async function handleSubirFoto(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo || !productoIdActivo) return

    setSubiendoFoto(true)
    setFormError('')
    try {
      const extension = archivo.name.split('.').pop()
      const ruta = `${productoIdActivo}/${Date.now()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(ruta, archivo, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('productos').getPublicUrl(ruta)
      const siguienteOrden = fotosActivo.reduce((max, f) => Math.max(max, f.orden || 0), 0) + 1

      const { data: fotoInsertada, error: insertError } = await supabase
        .from('producto_fotos')
        .insert({
          producto_id: productoIdActivo,
          url: publicUrlData.publicUrl,
          orden: siguienteOrden,
          color: colorFotoNueva.trim() || null,
        })
        .select()
        .single()
      if (insertError) throw insertError

      setFotosActivo((prev) => [...prev, fotoInsertada])
      setFotosPorProducto((prev) => ({
        ...prev,
        [productoIdActivo]: [...(prev[productoIdActivo] || []), fotoInsertada],
      }))
    } catch (err) {
      setFormError('No se pudo subir la foto. ' + err.message)
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function handleEliminarFoto(foto) {
    const confirmado = window.confirm('¿Eliminar esta foto del producto?')
    if (!confirmado) return

    setFormError('')
    try {
      const ruta = extraerRutaStorage(foto.url)
      if (ruta) {
        await supabase.storage.from('productos').remove([ruta])
      }
      const { error: deleteError } = await supabase.from('producto_fotos').delete().eq('id', foto.id)
      if (deleteError) throw deleteError

      setFotosActivo((prev) => prev.filter((f) => f.id !== foto.id))
      setFotosPorProducto((prev) => ({
        ...prev,
        [productoIdActivo]: (prev[productoIdActivo] || []).filter((f) => f.id !== foto.id),
      }))
    } catch (err) {
      setFormError('No se pudo eliminar la foto. ' + err.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Lista, crea, edita y desactiva productos. Sube fotos al bucket 'productos'."
        action={
          <button
            type="button"
            onClick={abrirModalNuevo}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            + Nuevo producto
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Filtrar por categoría:</label>
        <select
          value={filtroCategoriaId}
          onChange={(e) => setFiltroCategoriaId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando productos…
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No hay productos para mostrar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) => {
                const fotos = fotosPorProducto[producto.id] || []
                const portada = fotos[0]
                const categoria = categoriaPorId[producto.categoria_id]
                return (
                  <tr key={producto.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      {portada ? (
                        <img
                          src={portada.url}
                          alt={producto.nombre}
                          className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                          Sin foto
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{producto.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{categoria?.nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          producto.activo
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatPrecio(producto.precio)}</td>
                    <td className="px-4 py-3 text-slate-700">{producto.stock}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(producto)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActivo(producto)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            producto.activo
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {producto.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal.open}
        title={modal.producto ? 'Editar producto' : 'Nuevo producto'}
        onClose={cerrarModal}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Categoría</label>
              <select
                required
                value={form.categoria_id}
                onChange={(e) => actualizarCampo('categoria_id', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Selecciona…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Subcategoría</label>
              <select
                value={form.subcategoria_id}
                onChange={(e) => actualizarCampo('subcategoria_id', e.target.value)}
                disabled={!form.categoria_id}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
              >
                <option value="">Sin subcategoría</option>
                {subcategoriasDeForm.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Ej. iPhone 13 128GB"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {permiteSeminuevo && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => actualizarCampo('estado', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  {ESTADOS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {esCelular && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Grado interno</label>
                <select
                  value={form.grado_interno}
                  onChange={(e) => actualizarCampo('grado_interno', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Sin grado</option>
                  {GRADOS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Precio</label>
              <input
                required
                type="text"
                inputMode="numeric"
                value={formatMiles(form.precio)}
                onChange={(e) => actualizarPrecio('precio', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Precio anterior</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatMiles(form.precio_anterior)}
                onChange={(e) => actualizarPrecio('precio_anterior', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="0"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.en_oferta}
                  onChange={(e) => actualizarCampo('en_oferta', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-100"
                />
                En oferta
              </label>
            </div>
          </div>

          {esCelular && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Almacenamiento</label>
                <input
                  value={form.almacenamiento}
                  onChange={(e) => actualizarCampo('almacenamiento', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. 128GB"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Pantalla</label>
                <input
                  value={form.pantalla}
                  onChange={(e) => actualizarCampo('pantalla', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. 6.1'' OLED"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Procesador</label>
                <input
                  value={form.procesador}
                  onChange={(e) => actualizarCampo('procesador', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. A15 Bionic"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Cámara</label>
                <input
                  value={form.camara}
                  onChange={(e) => actualizarCampo('camara', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. 12MP dual"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Material</label>
                <input
                  value={form.material}
                  onChange={(e) => actualizarCampo('material', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. Aluminio"
                />
              </div>
            </div>
          )}

          {esAccesorios && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Características</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {form.caracteristicas.map((c, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => eliminarCaracteristica(i)}
                      className="text-slate-400 hover:text-slate-600"
                      aria-label="Eliminar característica"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={caracteristicaInput}
                  onChange={(e) => setCaracteristicaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      agregarCaracteristica()
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Ej. Cancelación de ruido activa"
                />
                <button
                  type="button"
                  onClick={agregarCaracteristica}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  + Agregar
                </button>
              </div>
            </div>
          )}

          {esAccesorios && productoIdActivo && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-4">
              <p className="text-sm font-semibold text-orange-800">Ofertas de bundle</p>

              {/* Bundle x2 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={bundleForm.bundle_2_activo}
                    onChange={(e) => setBundleForm((prev) => ({ ...prev, bundle_2_activo: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-100"
                  />
                  Activar oferta por llevar 2
                </label>
                {bundleForm.bundle_2_activo && (
                  <div className="flex items-center gap-2 pl-6">
                    <select
                      value={bundleForm.bundle_2_tipo}
                      onChange={(e) => setBundleForm((prev) => ({ ...prev, bundle_2_tipo: e.target.value }))}
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                    >
                      <option value="porcentaje">% descuento</option>
                      <option value="valor">$ descuento fijo</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={bundleForm.bundle_2_descuento}
                      onChange={(e) => setBundleForm((prev) => ({ ...prev, bundle_2_descuento: e.target.value }))}
                      className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                      placeholder={bundleForm.bundle_2_tipo === 'porcentaje' ? 'Ej. 15' : 'Ej. 5000'}
                    />
                    <span className="text-xs text-slate-500">{bundleForm.bundle_2_tipo === 'porcentaje' ? '%' : 'COP'} por unidad</span>
                  </div>
                )}
              </div>

              {/* Bundle x3 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={bundleForm.bundle_3_activo}
                    onChange={(e) => setBundleForm((prev) => ({ ...prev, bundle_3_activo: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-100"
                  />
                  Activar oferta por llevar 3
                </label>
                {bundleForm.bundle_3_activo && (
                  <div className="flex items-center gap-2 pl-6">
                    <select
                      value={bundleForm.bundle_3_tipo}
                      onChange={(e) => setBundleForm((prev) => ({ ...prev, bundle_3_tipo: e.target.value }))}
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                    >
                      <option value="porcentaje">% descuento</option>
                      <option value="valor">$ descuento fijo</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={bundleForm.bundle_3_descuento}
                      onChange={(e) => setBundleForm((prev) => ({ ...prev, bundle_3_descuento: e.target.value }))}
                      className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                      placeholder={bundleForm.bundle_3_tipo === 'porcentaje' ? 'Ej. 20' : 'Ej. 8000'}
                    />
                    <span className="text-xs text-slate-500">{bundleForm.bundle_3_tipo === 'porcentaje' ? '%' : 'COP'} por unidad</span>
                  </div>
                )}
              </div>

              {/* Preview dinámico del cálculo */}
              {form.precio && (bundleForm.bundle_2_activo || bundleForm.bundle_3_activo) && (() => {
                const precio = parseInt(form.precio, 10)
                const calcPreview = (cantidad, tipo, descuento) => {
                  if (!descuento) return null
                  const descU = tipo === 'porcentaje' ? Math.round(precio * parseFloat(descuento) / 100) : parseFloat(descuento)
                  const pU = Math.max(0, precio - descU)
                  const total = precio * cantidad
                  const totalDesc = pU * cantidad
                  return { total, totalDesc, ahorro: total - totalDesc, pU }
                }
                const p2 = bundleForm.bundle_2_activo ? calcPreview(2, bundleForm.bundle_2_tipo, bundleForm.bundle_2_descuento) : null
                const p3 = bundleForm.bundle_3_activo ? calcPreview(3, bundleForm.bundle_3_tipo, bundleForm.bundle_3_descuento) : null
                const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
                return (
                  <div className="rounded-lg bg-white border border-orange-100 px-3 py-2 text-xs space-y-1">
                    <p className="font-semibold text-orange-700">Vista previa del cálculo</p>
                    {p2 && <p className="text-slate-600">x2: <s className="text-slate-400">{fmt(p2.total)}</s> → <strong>{fmt(p2.totalDesc)}</strong> · Cada uno a {fmt(p2.pU)} · Ahorras {fmt(p2.ahorro)}</p>}
                    {p3 && <p className="text-slate-600">x3: <s className="text-slate-400">{fmt(p3.total)}</s> → <strong>{fmt(p3.totalDesc)}</strong> · Cada uno a {fmt(p3.pU)} · Ahorras {fmt(p3.ahorro)}</p>}
                  </div>
                )
              })()}

              <button
                type="button"
                onClick={guardarBundle}
                disabled={guardandoBundle}
                className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
              >
                {guardandoBundle ? 'Guardando…' : 'Guardar bundle'}
              </button>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea
              rows={3}
              value={form.descripcion}
              onChange={(e) => actualizarCampo('descripcion', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Detalles adicionales del producto…"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.incluye_regalo}
                onChange={(e) => actualizarCampo('incluye_regalo', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-100"
              />
              Incluye regalo
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.destacado}
                onChange={(e) => actualizarCampo('destacado', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-100"
              />
              Destacado
            </label>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Variantes (color, almacenamiento, precio y stock{esAccesorios ? ', con modelo compatible si aplica' : ''})
            </label>
            <p className="mb-2 text-xs text-slate-500">
              Almacenamiento y precio son opcionales. Si el precio de una variante queda vacío, el sitio público usa el precio base del producto.
            </p>
            {!productoIdActivo ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Guarda el producto primero para poder administrar sus variantes.
              </p>
            ) : (
              <div className="space-y-3">
                {variantesActivo.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          {esAccesorios && <th className="px-3 py-2">Modelo compatible</th>}
                          <th className="px-3 py-2">Color</th>
                          <th className="px-3 py-2">Almacenamiento</th>
                          <th className="px-3 py-2">Precio</th>
                          <th className="px-3 py-2">Stock</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {variantesActivo.map((v) => (
                          <tr key={v.id} className="border-t border-slate-100">
                            {esAccesorios && (
                              <td className="px-3 py-2">
                                <input
                                  defaultValue={v.modelo_compatible || ''}
                                  onBlur={(e) => actualizarVariante(v, 'modelo_compatible', e.target.value.trim() || null)}
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                                  placeholder="Sin modelo (aplica a todos)"
                                />
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  defaultValue={v.color_hex || '#000000'}
                                  onChange={(e) => actualizarVariante(v, 'color_hex', e.target.value)}
                                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-slate-200"
                                  title="Color exacto para el sitio público"
                                />
                                <input
                                  defaultValue={v.color}
                                  onBlur={(e) => actualizarVariante(v, 'color', e.target.value.trim())}
                                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                                  placeholder="Ej. Azul medianoche"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                defaultValue={v.almacenamiento || ''}
                                onBlur={(e) => actualizarVariante(v, 'almacenamiento', e.target.value.trim() || null)}
                                className="w-28 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                                placeholder="Ej. 128GB"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                defaultValue={v.precio ?? ''}
                                onBlur={(e) => actualizarVariante(v, 'precio', e.target.value)}
                                className="w-28 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                                placeholder="Precio base"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                defaultValue={v.stock}
                                onBlur={(e) => actualizarVariante(v, 'stock', e.target.value)}
                                className="w-20 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => eliminarVariante(v)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {esAccesorios && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Modelo compatible</label>
                      <input
                        value={nuevaVariante.modelo_compatible}
                        onChange={(e) =>
                          setNuevaVariante((prev) => ({ ...prev, modelo_compatible: e.target.value }))
                        }
                        className="w-44 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                        placeholder="Opcional"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={nuevaVariante.color_hex}
                        onChange={(e) => setNuevaVariante((prev) => ({ ...prev, color_hex: e.target.value }))}
                        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-300"
                        title="Color exacto para el sitio público"
                      />
                      <input
                        value={nuevaVariante.color}
                        onChange={(e) => setNuevaVariante((prev) => ({ ...prev, color: e.target.value }))}
                        className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                        placeholder="Ej. Azul medianoche"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Almacenamiento</label>
                    <input
                      value={nuevaVariante.almacenamiento}
                      onChange={(e) => setNuevaVariante((prev) => ({ ...prev, almacenamiento: e.target.value }))}
                      className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                      placeholder="Ej. 128GB"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Precio</label>
                    <input
                      type="number"
                      min="0"
                      value={nuevaVariante.precio}
                      onChange={(e) => setNuevaVariante((prev) => ({ ...prev, precio: e.target.value }))}
                      className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                      placeholder="Precio base"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={nuevaVariante.stock}
                      onChange={(e) => setNuevaVariante((prev) => ({ ...prev, stock: e.target.value }))}
                      className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={agregarVariante}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    + Agregar variante
                  </button>
                </div>

                {esAccesorios && (
                  <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Modelos (separados por coma)
                      </label>
                      <input
                        value={variantesBulk.modelos}
                        onChange={(e) => setVariantesBulk((prev) => ({ ...prev, modelos: e.target.value }))}
                        className="w-64 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                        placeholder="iPhone 13, iPhone 13 Pro Max"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Colores (separados por coma)
                      </label>
                      <input
                        value={variantesBulk.colores}
                        onChange={(e) => setVariantesBulk((prev) => ({ ...prev, colores: e.target.value }))}
                        className="w-56 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                        placeholder="Negro, Rosado, Azul"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={generarCombinaciones}
                      className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      Generar combinaciones (stock en 0)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Fotos</label>
            {!productoIdActivo ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Guarda el producto primero para poder subir sus fotos.
              </p>
            ) : (
              <div>
                <div className="mb-3 flex flex-wrap gap-3">
                  {fotosActivo.map((foto) => (
                    <div key={foto.id} className="group relative h-20 w-20">
                      <img
                        src={foto.url}
                        alt=""
                        className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                      />
                      <span className="absolute bottom-0 left-0 right-0 truncate rounded-b-lg bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                        {foto.color || 'General'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEliminarFoto(foto)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow transition-colors hover:bg-red-700"
                        aria-label="Eliminar foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Color de la foto</label>
                    <select
                      value={colorFotoNueva}
                      onChange={(e) => setColorFotoNueva(e.target.value)}
                      className="w-44 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                    >
                      <option value="">General (sin color)</option>
                      {[...new Set(variantesActivo.map((v) => v.color).filter(Boolean))].map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="inline-block cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100">
                    {subiendoFoto ? 'Subiendo…' : '+ Subir foto'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleSubirFoto}
                      disabled={subiendoFoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cerrarModal}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Guardando…' : modal.producto ? 'Guardar cambios' : 'Crear y continuar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
