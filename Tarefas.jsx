import { useState } from 'react'
import { useTaskStore, useProjStore, usePomoStore, useUIStore } from '@/store'

const PRI_COLORS = { alta: 'bg-red-400', media: 'bg-amber-400', baixa: 'bg-green-400' }

function TaskModal({ task, onClose }) {
  const { addTask, updateTask } = useTaskStore()
  const { projects } = useProjStore()
  const toLocal = (value) => value ? new Date(value).toISOString().slice(0, 16) : ''
  const [form, setForm] = useState(task ? { ...task, dueAt: toLocal(task.dueAt), scheduledStart: toLocal(task.scheduledStart), scheduledEnd: toLocal(task.scheduledEnd) } : { title: '', pri: 'media', status: 'pendente', projId: '', pomo: 1, desc: '', dueAt: '', scheduledStart: '', scheduledEnd: '' })

  const save = () => {
    if (!form.title.trim()) return
    const data = {
      ...form,
      projId: form.projId || null,
      pomo: Number(form.pomo) || 1,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : '',
      scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : '',
      scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : '',
    }
    task ? updateTask(task.id, data) : addTask(data)
    onClose()
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <h3 className="text-sm font-medium mb-4">{task ? 'Editar tarefa' : 'Nova tarefa'}</h3>
        <div className="space-y-3">
          <div><label className="label">Título</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="O que precisa ser feito?" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Prioridade</label>
              <select className="select w-full" value={form.pri} onChange={(e) => setForm({ ...form, pri: e.target.value })}>
                <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pendente">Pendente</option><option value="andamento">Em andamento</option><option value="concluida">Concluída</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Projeto</label>
              <select className="select w-full" value={form.projId || ''} onChange={(e) => setForm({ ...form, projId: e.target.value })}>
                <option value="">Sem projeto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label className="label">Pomodoros est.</label><input type="number" className="input" value={form.pomo} min={1} max={20} onChange={(e) => setForm({ ...form, pomo: e.target.value })} /></div>
          </div>
          <div><label className="label">Descrição</label><textarea className="input h-16 resize-none" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Prazo</label><input type="datetime-local" className="input" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
            <div><label className="label">Início na agenda</label><input type="datetime-local" className="input" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} /></div>
          </div>
          <div><label className="label">Fim na agenda</label><input type="datetime-local" className="input" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onEdit, onFocus }) {
  const { toggleDone, deleteTask, addSub, toggleSub } = useTaskStore()
  const { projects } = useProjStore()
  const [subInput, setSubInput] = useState('')
  const proj = projects.find((p) => p.id === task.projId)
  const done = task.status === 'concluida'

  return (
    <div className="card mb-2 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggleDone(task.id)}
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[9px] transition-colors ${done ? 'bg-brand-800 border-brand-800 text-white' : 'border-gray-300'}`}
        >
          {done && '✓'}
        </button>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRI_COLORS[task.pri]}`} />
        <span className={`flex-1 text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</span>
        <div className="flex gap-0.5 ml-auto">
          <button onClick={() => onFocus(task.id)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs" title="Iniciar foco">▶</button>
          <button onClick={() => onEdit(task)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs">✎</button>
          <button onClick={() => deleteTask(task.id)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 text-xs">✕</button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 ml-6 flex-wrap">
        <span className={`chip chip-${task.status}`}>{task.status === 'andamento' ? 'Em andamento' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}</span>
        <span className={`chip chip-${task.pri}`}>{task.pri.charAt(0).toUpperCase() + task.pri.slice(1)}</span>
        <span className="chip bg-gray-50 text-gray-500 border-gray-200">🍅 {task.pomo}</span>
        {task.scheduledStart && <span className="chip bg-brand-50 text-brand-700 border-brand-200">Agenda {new Date(task.scheduledStart).toLocaleDateString('pt-BR')} {new Date(task.scheduledStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
        {!task.scheduledStart && task.dueAt && <span className="chip bg-amber-50 text-amber-700 border-amber-200">Prazo {new Date(task.dueAt).toLocaleDateString('pt-BR')}</span>}
        {proj && <span className="chip bg-gray-50 text-gray-500 border-gray-200 max-w-[120px] truncate">📁 {proj.name}</span>}
      </div>

      {/* Subtarefas */}
      <div className="ml-6 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        {task.subs.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 py-0.5">
            <button onClick={() => toggleSub(task.id, s.id)} className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] flex-shrink-0 ${s.done ? 'bg-brand-800 border-brand-800 text-white' : 'border-gray-300'}`}>{s.done && '✓'}</button>
            <span className={`text-xs ${s.done ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{s.t}</span>
          </div>
        ))}
        <div className="flex gap-1.5 mt-1">
          <input className="flex-1 h-7 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:border-brand-400" placeholder="+ subtarefa" value={subInput}
            onChange={(e) => setSubInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && subInput.trim()) { addSub(task.id, subInput.trim()); setSubInput('') } }}
          />
          <button onClick={() => { if (subInput.trim()) { addSub(task.id, subInput.trim()); setSubInput('') } }} className="h-7 w-7 bg-brand-800 text-white rounded-md text-sm">+</button>
        </div>
      </div>
    </div>
  )
}

export default function Tarefas() {
  const { tasks } = useTaskStore()
  const [modal, setModal] = useState(null)
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [priF, setPriF] = useState('')
  const [stF, setStF] = useState('')

  const filtered = tasks.filter((t) =>
    (!search || t.title.toLowerCase().includes(search.toLowerCase())) &&
    (!priF || t.pri === priF) && (!stF || t.status === stF)
  )

  const onFocus = (id) => {
    usePomoStore.getState().setActiveTask(id)
    useUIStore.getState().setPanel('foco')
  }

  const cols = { pendente: [], andamento: [], concluida: [] }
  filtered.forEach((t) => cols[t.status]?.push(t))

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input className="input flex-1 min-w-[160px]" placeholder="Buscar tarefas..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" value={priF} onChange={(e) => setPriF(e.target.value)}>
          <option value="">Prioridade</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
        </select>
        <select className="select" value={stF} onChange={(e) => setStF(e.target.value)}>
          <option value="">Status</option><option value="pendente">Pendente</option><option value="andamento">Em andamento</option><option value="concluida">Concluída</option>
        </select>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button onClick={() => setView('list')} className={`px-3 h-8 text-sm ${view === 'list' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>☰</button>
          <button onClick={() => setView('kanban')} className={`px-3 h-8 text-sm ${view === 'kanban' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}>⊞</button>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}>+ Tarefa</button>
      </div>

      {view === 'list' ? (
        filtered.length ? filtered.map((t) => <TaskCard key={t.id} task={t} onEdit={setModal} onFocus={onFocus} />)
          : <p className="text-center text-sm text-gray-400 py-10">Nenhuma tarefa encontrada.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {(['pendente', 'andamento', 'concluida']).map((st) => (
            <div key={st} className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">{st === 'andamento' ? 'Em andamento' : st.charAt(0).toUpperCase() + st.slice(1)}</span>
                <span className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5">{cols[st].length}</span>
              </div>
              {cols[st].map((t) => (
                <div key={t.id} className="card mb-2 cursor-pointer hover:border-gray-300" onClick={() => setModal(t)}>
                  <p className="text-sm font-medium mb-2">{t.title}</p>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <div className={`w-2 h-2 rounded-full ${PRI_COLORS[t.pri]}`} />
                    <span className="chip bg-gray-50 text-gray-500 border-gray-200 text-[10px]">🍅 {t.pomo}</span>
                    <button onClick={(e) => { e.stopPropagation(); onFocus(t.id) }} className="ml-auto text-[10px] bg-brand-800 text-white px-2 py-0.5 rounded">▶</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {modal !== null && <TaskModal task={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
