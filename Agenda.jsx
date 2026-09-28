import { useState, useEffect } from 'react'
import { useAgendaStore, useTaskStore, useUIStore } from '@/store'
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInMinutes, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { initGoogleCalendar, authorize, listEvents, createEvent, isGoogleCalendarConfigured } from '@/lib/googleCalendar'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 7h–22h
const COLOR_MAP = {
  purple: 'bg-brand-100 border-brand-400 text-brand-800',
  teal:   'bg-teal-100 border-teal-400 text-teal-800',
  coral:  'bg-orange-100 border-orange-400 text-orange-800',
  amber:  'bg-amber-100 border-amber-400 text-amber-800',
}
const TASK_COLOR_MAP = {
  alta: 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/30 dark:text-red-100',
  media: 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100',
  baixa: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:text-green-100',
}

function EventModal({ event, defaultDate, onClose }) {
  const { addEvent, updateEvent, gcalConnected } = useAgendaStore()
  const [syncGoogle, setSyncGoogle] = useState(gcalConnected)
  const iso = (d) => d ? new Date(d).toISOString().slice(0, 16) : ''
  const [form, setForm] = useState({
    title: event?.title || '',
    start: event ? iso(event.start) : (defaultDate ? iso(defaultDate) : iso(new Date())),
    end:   event ? iso(event.end)   : iso(new Date(Date.now() + 3600000)),
    color: event?.color || 'purple',
    type:  event?.type || 'study',
  })

  const save = async () => {
    if (!form.title.trim()) return
    let payload = form
    if (!event && gcalConnected && syncGoogle) {
      try {
        const gEvent = await createEvent({
          summary: form.title,
          start: { dateTime: new Date(form.start).toISOString() },
          end: { dateTime: new Date(form.end).toISOString() },
        })
        payload = { ...form, gcalId: gEvent.id }
      } catch {
        alert('Evento salvo localmente, mas nao foi enviado ao Google Calendar.')
      }
    }
    event ? updateEvent(event.id, payload) : addEvent(payload)
    onClose()
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <h3 className="text-sm font-medium mb-4">{event ? 'Editar evento' : 'Novo evento'}</h3>
        <div className="space-y-3">
          <div><label className="label">Título</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Início</label><input type="datetime-local" className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div><label className="label">Fim</label><input type="datetime-local" className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cor</label>
              <select className="select w-full" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                <option value="purple">Roxo</option><option value="teal">Verde</option><option value="coral">Coral</option><option value="amber">Âmbar</option>
              </select>
            </div>
            <div><label className="label">Tipo</label>
              <select className="select w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="study">Estudo</option><option value="practice">Questões</option><option value="review">Revisão</option><option value="other">Outro</option>
              </select>
            </div>
          </div>
          {gcalConnected && !event && (
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={syncGoogle} onChange={(e) => setSyncGoogle(e.target.checked)} />
              Criar tambem no Google Calendar
            </label>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function Agenda() {
  const { events, gcalConnected, addEvent, deleteEvent, setGcalConnected } = useAgendaStore()
  const { tasks, updateTask, toggleDone } = useTaskStore()
  const { setPanel } = useUIStore()
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [modal, setModal] = useState(null)
  const [gcalReady, setGcalReady] = useState(false)

  useEffect(() => {
    initGoogleCalendar(() => setGcalReady(true))
  }, [])

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const taskBlocks = tasks
    .filter((task) => task.scheduledStart && task.scheduledEnd)
    .map((task) => ({
      id: `task-${task.id}`,
      taskId: task.id,
      title: task.title,
      start: task.scheduledStart,
      end: task.scheduledEnd,
      color: task.pri,
      type: 'task',
      status: task.status,
      pomo: task.pomo,
    }))

  const calendarItems = [
    ...events.map((event) => ({ ...event, kind: 'event' })),
    ...taskBlocks.map((task) => ({ ...task, kind: 'task' })),
  ]

  const eventsOnDay = (day) => calendarItems.filter((item) => item.start && isSameDay(parseISO(item.start), day))
  const weekEnd = addDays(weekStart, 6)
  const unscheduledWeekTasks = tasks.filter((task) => {
    if (!task.dueAt || task.scheduledStart || task.status === 'concluida') return false
    const due = parseISO(task.dueAt)
    return isWithinInterval(due, { start: weekStart, end: new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59) })
  })

  const topForEvent = (e) => {
    const start = parseISO(e.start)
    const mins = (start.getHours() - 7) * 60 + start.getMinutes()
    return (mins / (15 * 60)) * 100
  }

  const heightForEvent = (e) => {
    const mins = differenceInMinutes(parseISO(e.end), parseISO(e.start))
    return Math.max((mins / (15 * 60)) * 100, 3)
  }

  const connectGcal = async () => {
    try { await authorize(); setGcalConnected(true) }
    catch (e) { alert('Erro ao conectar Google Calendar') }
  }

  const syncGcal = async () => {
    try {
      const now = new Date()
      const items = await listEvents(now.toISOString(), new Date(now.getTime() + 7 * 86400000).toISOString())
      items.forEach((ev) => {
        if (!events.find((e) => e.gcalId === ev.id)) {
          addEvent({ title: ev.summary, start: ev.start.dateTime || ev.start.date, end: ev.end.dateTime || ev.end.date, color: 'teal', type: 'other', gcalId: ev.id })
        }
      })
    } catch (e) { alert('Erro ao sincronizar') }
  }

  const clickTimeSlot = (day, hour) => {
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start.getTime() + 3600000)
    setModal({ defaultDate: start, end: end.toISOString() })
  }

  const scheduleTask = (task, day = currentDate, hour = 9) => {
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    const durationMinutes = Math.max(25, Number(task.pomo || 1) * 25)
    const end = new Date(start.getTime() + durationMinutes * 60000)
    updateTask(task.id, {
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
      dueAt: task.dueAt || end.toISOString(),
    })
  }

  return (
    <div className="fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button className="btn-secondary" onClick={() => setCurrentDate(addDays(currentDate, -7))}>←</button>
        <button className="btn-secondary" onClick={() => setCurrentDate(new Date())}>Hoje</button>
        <button className="btn-secondary" onClick={() => setCurrentDate(addDays(currentDate, 7))}>→</button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
          {format(weekStart, "d 'de' MMMM", { locale: ptBR })} – {format(addDays(weekStart, 6), "d 'de' MMMM yyyy", { locale: ptBR })}
        </span>
        {!isGoogleCalendarConfigured ? (
          <span className="chip bg-amber-50 text-amber-700 border-amber-200">Configure Google no .env</span>
        ) : !gcalConnected ? (
          <button className="btn-secondary text-xs" onClick={connectGcal} disabled={!gcalReady}>
            {gcalReady ? 'Conectar Google Calendar' : 'Carregando Google...'}
          </button>
        ) : (
          <button className="btn-secondary text-xs" onClick={syncGcal}>Sincronizar Google</button>
        )}
        <button className="btn-primary" onClick={() => setModal({})}>+ Evento</button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-4">
      {/* Calendário semanal */}
      <div className="card overflow-hidden p-0">
        {/* Header dias */}
        <div className="grid border-b border-gray-200 dark:border-gray-800" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div className="p-2" />
          {weekDays.map((day) => (
            <div key={day} className={`p-2 text-center border-l border-gray-200 dark:border-gray-800 ${isSameDay(day, new Date()) ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
              <div className="text-xs text-gray-400">{format(day, 'EEE', { locale: ptBR })}</div>
              <div className={`text-sm font-medium mt-0.5 ${isSameDay(day, new Date()) ? 'text-brand-800' : 'text-gray-700 dark:text-gray-300'}`}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Grade de horas */}
        <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
          <div className="relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            {HOURS.map((h) => (
              <div key={h} className="grid border-b border-gray-100 dark:border-gray-800/50" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', minHeight: '48px' }}>
                <div className="px-2 py-1 text-[10px] text-gray-400 text-right">{h}:00</div>
                {weekDays.map((day) => (
                  <div key={day} className="relative border-l border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                    onClick={() => clickTimeSlot(day, h)}>
                    {eventsOnDay(day).filter((e) => parseISO(e.start).getHours() === h).map((ev) => (
                      <div
                        key={ev.id}
                        className={`absolute left-0.5 right-0.5 rounded text-[10px] px-1 py-0.5 border-l-2 cursor-pointer truncate z-10 ${ev.kind === 'task' ? TASK_COLOR_MAP[ev.color] : COLOR_MAP[ev.color] || COLOR_MAP.purple} ${ev.status === 'concluida' ? 'opacity-55 line-through' : ''}`}
                        style={{
                          top: `${(parseISO(ev.start).getMinutes() / 60) * 48}px`,
                          minHeight: `${Math.max(22, Math.min(120, (differenceInMinutes(parseISO(ev.end), parseISO(ev.start)) / 60) * 48))}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (ev.kind === 'task') setPanel('tarefas')
                          else setModal(ev)
                        }}
                        title={ev.kind === 'task' ? `Tarefa - ${ev.status}` : 'Evento'}
                      >
                        {ev.kind === 'task' ? 'Tarefa: ' : ''}{ev.title}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="card h-fit">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Tarefas da semana</h3>
          <span className="chip bg-gray-50 text-gray-500 border-gray-200">{unscheduledWeekTasks.length}</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Tarefas com prazo nesta semana e ainda sem bloco de horario.</p>
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {unscheduledWeekTasks.length ? unscheduledWeekTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <button onClick={() => toggleDone(task.id)} className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${task.status === 'concluida' ? 'bg-brand-800 border-brand-800' : 'border-gray-300'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">Prazo: {new Date(task.dueAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-primary text-xs flex-1 justify-center" onClick={() => scheduleTask(task, task.dueAt ? parseISO(task.dueAt) : currentDate, 9)}>Agendar 9h</button>
                <button className="btn-secondary text-xs" onClick={() => setPanel('tarefas')}>Editar</button>
              </div>
            </div>
          )) : <p className="text-sm text-gray-400 text-center py-8">Nenhuma tarefa pendente sem horario nesta semana.</p>}
        </div>
      </aside>
      </div>

      {modal !== null && (
        <EventModal
          event={modal.id ? modal : null}
          defaultDate={modal.defaultDate}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
