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
  contraentrega_activa: false,
  ce_rango1_hasta: 50000,
  ce_rango1_tarifa: 6000,
  ce_rango2_hasta: 100000,
  ce_rango2_tarifa: 8000,
  ce_rango3_hasta: 200000,
  ce_rango3_tarifa: 12000,
  ce_rango4_tarifa: 15000,
}

function InputPrecio({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
    </div>
  )
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
          contraentrega_activa: data.contraentrega_activa ?? false,
          ce_rango1_hasta: data.ce_rango1_hasta ?? 50000,
          ce_rango1_tarifa: data.ce_rango1_tarifa ?? 6000,
          ce_rango2_hasta: data.ce_rango2_hasta ?? 100000,
          ce_rango2_tarifa: data.ce_rango2_tarifa ?? 8000,
          ce_rango3_hasta: data.ce_rango3_hasta ?? 200000,
          ce_rango3_tarifa: data.ce_rango3_tarifa ?? 12000,
          ce_rango4_tarifa: data.ce_rango4_tarifa ?? 15000,
        })
      }
    } catch (err) {
      setError('No se pudo cargar la configuración. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function set(campo, valor) {
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

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

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

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

        {/* ── Información general ─────────────────────────────────────────── */}
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700">Información general</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la tienda</label>
            <input value={form.nombre_tienda} onChange={(e) => set('nombre_tienda', e.target.value)}
              className={inputClass} placeholder="MatCell" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Número de WhatsApp</label>
            <input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)}
              className={inputClass} placeholder="Ej. 573001234567" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Instagram</label>
              <input value={form.instagram_url} onChange={(e) => set('instagram_url', e.target.value)}
                className={inputClass} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Facebook</label>
              <input value={form.facebook_url} onChange={(e) => set('facebook_url', e.target.value)}
                className={inputClass} placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">TikTok</label>
              <input value={form.tiktok_url} onChange={(e) => set('tiktok_url', e.target.value)}
                className={inputClass} placeholder="https://tiktok.com/@..." />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Mensaje de la barra superior
            </label>
            <input value={form.mensaje_barra_superior} onChange={(e) => set('mensaje_barra_superior', e.target.value)}
              className={inputClass} placeholder="Ej. Envío gratis a todo Colombia · Garantía de 6 meses" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descripción corta del footer</label>
            <textarea rows={3} value={form.descripcion_footer} onChange={(e) => set('descripcion_footer', e.target.value)}
              className={inputClass} placeholder="Texto breve sobre la tienda que aparece en el pie de página…" />
          </div>
        </section>

        {/* ── Contraentrega ───────────────────────────────────────────────── */}
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Contraentrega</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Cuando está activa, los clientes pueden pagar al recibir el pedido.
              </p>
            </div>
            {/* Toggle */}
            <button
              type="button"
              onClick={() => set('contraentrega_activa', !form.contraentrega_activa)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                form.contraentrega_activa ? 'bg-brand-600' : 'bg-slate-200'
              }`}
              role="switch"
              aria-checked={form.contraentrega_activa}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  form.contraentrega_activa ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className={form.contraentrega_activa ? '' : 'pointer-events-none opacity-40'}>
            <p className="mb-3 text-xs font-medium text-slate-600">
              Tarifas por rango de valor del pedido
            </p>

            <div className="space-y-3">
              {/* Rango 1 */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="col-span-2 text-xs font-medium text-slate-500">Rango 1</div>
                <InputPrecio
                  label="Pedidos hasta"
                  value={form.ce_rango1_hasta}
                  onChange={(v) => set('ce_rango1_hasta', v)}
                  placeholder="50000"
                />
                <InputPrecio
                  label="Tarifa"
                  value={form.ce_rango1_tarifa}
                  onChange={(v) => set('ce_rango1_tarifa', v)}
                  placeholder="6000"
                />
              </div>

              {/* Rango 2 */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="col-span-2 text-xs font-medium text-slate-500">Rango 2</div>
                <InputPrecio
                  label="Pedidos hasta"
                  value={form.ce_rango2_hasta}
                  onChange={(v) => set('ce_rango2_hasta', v)}
                  placeholder="100000"
                />
                <InputPrecio
                  label="Tarifa"
                  value={form.ce_rango2_tarifa}
                  onChange={(v) => set('ce_rango2_tarifa', v)}
                  placeholder="8000"
                />
              </div>

              {/* Rango 3 */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="col-span-2 text-xs font-medium text-slate-500">Rango 3</div>
                <InputPrecio
                  label="Pedidos hasta"
                  value={form.ce_rango3_hasta}
                  onChange={(v) => set('ce_rango3_hasta', v)}
                  placeholder="200000"
                />
                <InputPrecio
                  label="Tarifa"
                  value={form.ce_rango3_tarifa}
                  onChange={(v) => set('ce_rango3_tarifa', v)}
                  placeholder="12000"
                />
              </div>

              {/* Rango 4 */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="col-span-2 text-xs font-medium text-slate-500">
                  Rango 4 — más de ${form.ce_rango3_hasta?.toLocaleString('es-CO')}
                </div>
                <div className="col-span-2">
                  <InputPrecio
                    label="Tarifa"
                    value={form.ce_rango4_tarifa}
                    onChange={(v) => set('ce_rango4_tarifa', v)}
                    placeholder="15000"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

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
