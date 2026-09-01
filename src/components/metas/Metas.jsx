import { useState } from 'react'
import { useMetaStore } from '@/store'

const PERIOD_LABEL = { dia: 'Diária', sem: 'Semanal', mes: 'Mensal' }

function MetaModal({ onClose }) {
  const { addMeta } = useMetaStore()
  const [form, setForm] = useState({ title: '', period: 'dia', target: 10, unit: 'horas' })
  const save = () => { if (!form.title.trim()) return; addMeta({ ...form, target: Number(form.target) }); onClose() }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <h3 className="text-sm font-medium mb-4">Nova meta</h3>
        <div className="space-y-3">
          <div><label className="label">Título</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Estudar 2h por dia" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Período</label>
              <select className="select w-full" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                <option value="dia">Diária</option><option value="sem">Semanal</option><option value="mes">Mensal</option>
              </select>
            </div>
            <div><label className="label">Meta (total)</label><input type="number" className="input" value={form.target} min={1} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
          </div>
          <div><label className="label">Unidade</label><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="horas, questões, artigos..." /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function Metas() {
  const { metas, incMeta, deleteMeta } = useMetaStore()
  const [tab, setTab] = useState('dia')
  const [modal, setModal] = useState(false)

  const filtered = metas.filter((m) => m.period === tab)
  const COLOR = (pct) => pct >= 100 ? 'bg-teal-500' : pct >= 50 ? 'bg-amber-500' : 'bg-brand-600'
  const TEXT  = (pct) => pct >= 100 ? 'text-teal-600' : pct >= 50 ? 'text-amber-600' : 'text-brand-600'

  return (
    <div className="fade-in">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {(['dia','sem','mes']).map((p) => (
            <button key={p} onClick={() => setTab(p)}
              className={`px-4 h-8 text-sm transition-colors ${tab === p ? 'bg-brand-800 text-white' : 'bg-white dark:bg-gray-900 text-gray-500'}`}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button className="btn-primary" onClick={() => setModal(true)}>+ Meta</button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-12">
          Nenhuma meta {PERIOD_LABEL[tab].toLowerCase()} ainda.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((m) => {
          const pct = Math.min(100, Math.round((m.current / m.target) * 100))
          return (
            <div key={m.id} className="card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{m.title}</span>
                <span className={`text-sm font-medium ${TEXT(pct)}`}>{pct}%</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{m.current.toFixed(1)} de {m.target} {m.unit}</p>
              <div className="progress-bar mb-3"><div className={`progress-fill ${COLOR(pct)}`} style={{ width: `${pct}%` }} /></div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 flex-1">{pct >= 100 ? '✓ Concluída' : pct >= 50 ? 'Em andamento' : 'Iniciada'}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => incMeta(m.id, -1)} className="w-6 h-6 border border-gray-200 dark:border-gray-700 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center justify-center">−</button>
                  <span className="text-sm font-medium w-8 text-center">{m.current.toFixed(1)}</span>
                  <button onClick={() => incMeta(m.id, 1)} className="w-6 h-6 border border-gray-200 dark:border-gray-700 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm flex items-center justify-center">+</button>
                  <button onClick={() => deleteMeta(m.id)} className="w-6 h-6 text-gray-300 hover:text-red-400 text-xs flex items-center justify-center ml-1">✕</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && <MetaModal onClose={() => setModal(false)} />}
    </div>
  )
}
