import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'

const ZONA_LABELS = {
  recogida_local: 'Recogida en tienda',
  nacional: 'Envío nacional',
}

function soloDigitos(valor) {
  return valor.replace(/[^0-9]/g, '')
}

function formatMiles(digitos) {
  if (!digitos) return ''
  return new Intl.NumberFormat('es-CO').format(parseInt(digitos, 10))
}

function ZonaForm({ zona, onGuardado }) {
  const [form, setForm] = useState({
    costo: String(zona.costo ?? '0'),
    dias_min: String(zona.dias_min ?? '0'),
    dias_max: String(zona.dias_max ?? '0'),
    gratis_desde_monto: zona.gratis_desde_monto != null ? String(zona.gratis_desde_monto) : '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  function actualizar(campo, valor) {
    setExito(false)
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.costo === '' || form.dias_min === '' || form.dias_max === '') {
      setError('Costo y días de entrega son obligatorios.')
      return
    }
    if (Number(form.dias_min) > Number(form.dias_max)) {
      setError('Los días mínimos no pueden ser mayores que los días máximos.')
      return
    }

    setGuardando(true)
    try {
      const { error: updateError } = await supabase
        .from('config_envios')
        .update({
          costo: parseInt(form.costo, 10),
          dias_min: parseInt(form.dias_min, 10),
          dias_max: parseInt(form.dias_max, 10),
          gratis_desde_monto: form.gratis_desde_monto === '' ? null : parseInt(form.gratis_desde_monto, 10),
        })
        .eq('id', zona.id)
      if (updateError) throw updateError
      setExito(true)
      onGuardado()
    } catch (err) {
      setError('No se pudo guardar. ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-base font-semibold text-slate-900">
        {ZONA_LABELS[zona.zona] || zona.zona}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Costo de envío</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatMiles(form.costo)}
            onChange={(e) => actualizar('costo', soloDigitos(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Monto mínimo para envío gratis
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={formatMiles(form.gratis_desde_monto)}
            onChange={(e) => actualizar('gratis_desde_monto', soloDigitos(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Sin envío gratis"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Días mínimos de entrega</label>
          <input
            type="number"
            min="0"
            value={form.dias_min}
            onChange={(e) => actualizar('dias_min', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Días máximos de entrega</label>
          <input
            type="number"
            min="0"
            value={form.dias_max}
            onChange={(e) => actualizar('dias_max', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {exito && !error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Cambios guardados.</p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}

export default function ConfiguracionEnvios() {
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadZonas()
  }, [])

  async function loadZonas() {
    setLoading(true)
    setError('')
    try {
      const { data, error: zonasError } = await supabase
        .from('config_envios')
        .select('*')
        .order('zona', { ascending: true })
      if (zonasError) throw zonasError
      setZonas(data || [])
    } catch (err) {
      setError('No se pudo cargar la configuración de envíos. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Configuración de envíos"
        description="Edita el costo de envío y el monto mínimo para envío gratis."
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cargando configuración…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {zonas.map((zona) => (
            <ZonaForm key={zona.id} zona={zona} onGuardado={loadZonas} />
          ))}
        </div>
      )}
    </div>
  )
}
