import { useState } from 'react'
import { useProjStore, useTaskStore } from '@/store'

const COLORS = { purple: '#534AB7', teal: '#1D9E75', amber: '#EF9F27', coral: '#D85A30' }
const FILLS  = { purple: 'bg-brand-600', teal: 'bg-teal-500', amber: 'bg-amber-500', coral: 'bg-orange-500' }

function ProjModal({ proj, onClose }) {
  const { addProject, updateProject } = useProjStore()
  const [form, setForm] = useState(proj ? {
    name: proj.name, desc: proj.desc, color: proj.color, hrsEst: proj.hrsEst,
    etapas: proj.etapas.map((e) => e.t).join('\n'),
  } : { name: '', desc: '', color: 'purple', hrsEst: 10, etapas: '' })

  const save = () => {
    if (!form.name.trim()) return
    const etapas = form.etapas.split('\n').filter((x) => x.trim())
    if (proj) {
      updateProject(proj.id, { ...form, hrsEst: Number(form.hrsEst), etapas: etapas.map((t, i) => ({ id: proj.etapas[i]?.id || Math.random().toString(36).slice(2), t, done: proj.etapas[i]?.done || false })) })
    } else {
      addProject({ ...form, hrsEst: Number(form.hrsEst), etapas })
    }
    onClose()
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <h3 className="text-sm font-medium mb-4">{proj ? 'Editar projeto' : 'Novo projeto'}</h3>
        <div className="space-y-3">
          <div><label className="label">Nome</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
          <div><label className="label">Descrição</label><textarea className="input h-16 resize-none" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cor</label>
              <select className="select w-full" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                <option value="purple">Roxo</option><option value="teal">Verde</option><option value="amber">Âmbar</option><option value="coral">Coral</option>
              </select>
            </div>
            <div><label className="label">Horas estimadas</label><input type="number" className="input" value={form.hrsEst} min={1} onChange={(e) => setForm({ ...form, hrsEst: e.target.value })} /></div>
          </div>
          <div><label className="label">Etapas (uma por linha)</label><textarea className="input h-20 resize-none" value={form.etapas} onChange={(e) => setForm({ ...form, etapas: e.target.value })} placeholder={"Leitura do material\nResolução de questões\nRevisão final"} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function ProjDetail({ proj, onBack }) {
  const { toggleEtapa, updateProject, deleteProject } = useProjStore()
  const { tasks, toggleDone } = useTaskStore()
  const [modal, setModal] = useState(false)

  const projTasks = tasks.filter((t) => t.projId === proj.id)
  const done = projTasks.filter((t) => t.status === 'concluida').length
  const pct  = projTasks.length ? Math.round((done / projTasks.length) * 100) : 0

  return (
    <div className="fade-in">
      <div className="flex items-center gap-3 mb-5">
        <button className="btn-secondary" onClick={onBack}>← Projetos</button>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[proj.color] }} />
        <h2 className="text-base font-medium flex-1">{proj.name}</h2>
        <button onClick={() => setModal(true)} className="btn-secondary text-xs">✎ Editar</button>
        <button onClick={() => { deleteProject(proj.id); onBack() }} className="btn-secondary text-xs text-red-500">✕</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[['Progresso', `${pct}%`, 'text-brand-600'], ['Horas', `${proj.hrsReal}h / ${proj.hrsEst}h`, ''], ['Tarefas', `${done}/${projTasks.length}`, '']].map(([l, v, c]) => (
          <div key={l} className="card"><div className={`text-2xl font-medium mb-1 ${c}`}>{v}</div><div className="text-xs text-gray-500">{l}</div></div>
        ))}
      </div>

      <div className="progress-bar mb-5 h-2">
        <div className={`progress-fill ${FILLS[proj.color]}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Etapas */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Etapas</h3>
        {proj.etapas.map((e) => (
          <div key={e.id} className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <button onClick={() => toggleEtapa(proj.id, e.id)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[9px] flex-shrink-0 transition-colors ${e.done ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300'}`}>
              {e.done && '✓'}
            </button>
            <span className={`text-sm ${e.done ? 'line-through text-gray-400' : ''}`}>{e.t}</span>
          </div>
        ))}
      </div>

      {/* Tarefas */}
      <div className="card">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Tarefas associadas</h3>
        {projTasks.length ? projTasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <button onClick={() => toggleDone(t.id)}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] flex-shrink-0 ${t.status === 'concluida' ? 'bg-brand-800 border-brand-800 text-white' : 'border-gray-300'}`}>
              {t.status === 'concluida' && '✓'}
            </button>
            <span className={`text-sm flex-1 ${t.status === 'concluida' ? 'line-through text-gray-400' : ''}`}>{t.title}</span>
            <span className={`chip chip-${t.pri}`}>{t.pri}</span>
          </div>
        )) : <p className="text-sm text-gray-400">Nenhuma tarefa ainda. Crie uma tarefa e associe a este projeto.</p>}
      </div>

      {modal && <ProjModal proj={proj} onClose={() => setModal(false)} />}
    </div>
  )
}

export default function Projetos() {
  const { projects } = useProjStore()
  const { tasks } = useTaskStore()
  const [modal, setModal]   = useState(false)
  const [detail, setDetail] = useState(null)

  if (detail) {
    const proj = projects.find((p) => p.id === detail)
    if (!proj) { setDetail(null); return null }
    return <ProjDetail proj={proj} onBack={() => setDetail(null)} />
  }

  const pct = (p) => {
    const pt = tasks.filter((t) => t.projId === p.id)
    return pt.length ? Math.round((pt.filter((t) => t.status === 'concluida').length / pt.length) * 100) : 0
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-gray-500">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</span>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Projeto</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {projects.map((p) => {
          const pt = tasks.filter((t) => t.projId === p.id)
          const pc = pct(p)
          return (
            <div key={p.id} className="card cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors" onClick={() => setDetail(p.id)}>
              <div className="flex items-start gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: COLORS[p.color] }} />
                <span className="text-sm font-medium flex-1 leading-tight">{p.name}</span>
                <span className="text-lg font-medium flex-shrink-0" style={{ color: COLORS[p.color] }}>{pc}%</span>
              </div>
              <div className="progress-bar mb-3"><div className={`progress-fill ${FILLS[p.color]}`} style={{ width: `${pc}%` }} /></div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>⏱ {p.hrsReal}h/{p.hrsEst}h</span>
                <span>📋 {pt.length} tarefas</span>
                <span>📍 {p.etapas.filter((e) => e.done).length}/{p.etapas.length} etapas</span>
              </div>
            </div>
          )
        })}

        <div className="card flex items-center justify-center min-h-[120px] border-dashed cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-gray-400 text-sm gap-2"
          onClick={() => setModal(true)}>
          + Novo projeto
        </div>
      </div>

      {modal && <ProjModal onClose={() => setModal(false)} />}
    </div>
  )
}
