import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'

const FORM_VACIO = {
  nombre_tienda: '',
  whatsapp: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  descripcion_footer: '',
  mensaje_barra_superior: '',
}

export default function ConfiguracionTienda() {
  const [configId, setConfigId] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const { data, error: configError } = await supabase.from('tienda_config').select('*').limit(1).maybeSingle()
      if (configError) throw configError
      if (data) {
        setConfigId(data.id)
        setForm({
          nombre_tienda: data.nombre_tienda || '',
          whatsapp: data.whatsapp || '',
          instagram_url: data.instagram_url || '',
          facebook_url: data.facebook_url || '',
          tiktok_url: data.tiktok_url || '',
          descripcion_footer: data.descripcion_footer || '',
          mensaje_barra_superior: data.mensaje_barra_superior || '',
        })
      }
    } catch (err) {
      setError('No se pudo cargar la configuración. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setGuardado(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      if (configId) {
        const { error: updateError } = await supabase.from('tienda_config').update(form).eq('id', configId)
        if (updateError) throw updateError
      } else {
        const { data, error: insertError } = await supabase
          .from('tienda_config')
          .insert(form)
          .select()
          .single()
        if (insertError) throw insertError
        setConfigId(data.id)
      }
      setGuardado(true)
    } catch (err) {
      setError('No se pudo guardar la configuración. ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Cargando configuración…
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Configuración de tienda"
        description="Datos de contacto, redes sociales y mensajes que se muestran en el sitio público."
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la tienda</label>
          <input
            value={form.nombre_tienda}
            onChange={(e) => actualizarCampo('nombre_tienda', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="MatCell"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Número de WhatsApp</label>
          <input
            value={form.whatsapp}
            onChange={(e) => actualizarCampo('whatsapp', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Ej. 573001234567"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Instagram</label>
            <input
              value={form.instagram_url}
              onChange={(e) => actualizarCampo('instagram_url', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Facebook</label>
            <input
              value={form.facebook_url}
              onChange={(e) => actualizarCampo('facebook_url', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">TikTok</label>
            <input
              value={form.tiktok_url}
              onChange={(e) => actualizarCampo('tiktok_url', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="https://tiktok.com/@..."
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Mensaje de la barra superior (envío / garantía)
          </label>
          <input
            value={form.mensaje_barra_superior}
            onChange={(e) => actualizarCampo('mensaje_barra_superior', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Ej. Envío gratis a todo Colombia · Garantía de 6 meses"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Descripción corta del footer</label>
          <textarea
            rows={3}
            value={form.descripcion_footer}
            onChange={(e) => actualizarCampo('descripcion_footer', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Texto breve sobre la tienda que aparece en el pie de página…"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {guardado && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Configuración guardada.</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
