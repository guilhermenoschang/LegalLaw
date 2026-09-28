import { useState, useRef, useEffect } from 'react'
import { useUIStore, useTaskStore, useProjStore, useAgendaStore, useMetaStore, useStudyStore, useNotesStore, useLegalSourceStore, useDisciplineStore } from '@/store'
import { askAI } from '@/lib/ai'

const PANEL_TITLES = {
  tarefas: 'Tarefas', foco: 'Pomodoro', projetos: 'Projetos', metas: 'Metas',
  disciplinas: 'Disciplinas',
  constituicao: 'Constituição', quiz: 'Quiz IA', pena: 'Calculadora de Pena',
  agenda: 'Agenda', estudos: 'Estudos', anotacoes: 'Anotações', audio: 'Áudio/Aulas',
  dashboard: 'Dashboard',
}

export default function ChatBubble() {
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState([{ role: 'ai', text: 'Olá! Sou seu assistente jurídico. Posso criar tarefas, explicar artigos, gerar questões e ajudar com o que precisar.' }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef(null)
  const inputRef = useRef(null)
  const { currentPanel } = useUIStore()
  const { tasks, addTask } = useTaskStore()
  const { projects, addProject } = useProjStore()
  const { addEvent } = useAgendaStore()
  const { addMeta } = useMetaStore()
  const { addStudySession } = useStudyStore()
  const { addNote } = useNotesStore()
  const { setNote } = useLegalSourceStore()
  const { disciplines, addDiscipline, replaceTopics, addMaterial } = useDisciplineStore()

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [msgs])
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [open, currentPanel, loading])

  const send = async () => {
    const msg = input.trim(); if (!msg || loading) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: msg }])
    setLoading(true)

    const ctx = PANEL_TITLES[currentPanel] || currentPanel
    const today = new Date().toISOString()
    const taskList = tasks.slice(0, 5).map((t) => `"${t.title}" (${t.status})`).join(', ')
    const projList = projects.map((p) => `"${p.name}"`).join(', ')
    const disciplineList = disciplines.map((d) => `"${d.name}"`).join(', ')

    const knownProjects = new Map(projects.map((p) => [p.name.toLowerCase(), p]))
    const findProject = (projectName) => {
      if (!projectName) return null
      return knownProjects.get(String(projectName).trim().toLowerCase()) || null
    }

    const normalizeSteps = (steps) => Array.isArray(steps)
      ? steps.map((step) => String(step).trim()).filter(Boolean)
      : []

    const knownDisciplines = new Map(disciplines.map((d) => [d.name.toLowerCase(), d]))
    const findDiscipline = (name) => name ? knownDisciplines.get(String(name).trim().toLowerCase()) || null : null
    const findTopic = (discipline, topicName) => {
      if (!discipline || !topicName) return null
      return (discipline.topics || []).find((topic) => topic.title.toLowerCase() === String(topicName).trim().toLowerCase()) || null
    }

    const parseDate = (value, fallbackOffsetHours = 1) => {
      const date = value ? new Date(value) : new Date(Date.now() + fallbackOffsetHours * 3600000)
      return Number.isNaN(date.getTime()) ? new Date(Date.now() + fallbackOffsetHours * 3600000).toISOString() : date.toISOString()
    }

    const penaltyCalc = (action) => {
      const base = Number(action.base || 0)
      const agravantes = Number(action.agravantes || 0)
      const atenuantes = Number(action.atenuantes || 0)
      const causasAumento = Number(action.causasAumento || action.aumento || 0)
      const causasDiminuicao = Number(action.causasDiminuicao || action.diminuicao || 0)
      const segundaFase = Math.max(0, base + agravantes - atenuantes)
      const final = Math.max(0, segundaFase * (1 + causasAumento / 100) * (1 - causasDiminuicao / 100))
      return `Cálculo educacional: pena-base ${base.toFixed(2)}, segunda fase ${segundaFase.toFixed(2)}, pena final aproximada ${final.toFixed(2)}. Confira limites legais, regime, concurso de crimes, causas especiais e dados do caso concreto.`
    }

    const applyAction = (action) => {
      if (!action?.action) return false

      if (action.action === 'create_project') {
        if (!action.name && !action.title) return false
        const name = String(action.name || action.title).trim()
        const existing = findProject(name)
        if (existing) {
          setMsgs((m) => [...m, { role: 'ai', text: `Esse projeto já existe: "${existing.name}".` }])
          return true
        }

        const id = `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        const project = {
          id,
          name,
          desc: action.desc || action.description || 'Criado pelo assistente',
          color: action.color || 'purple',
          hrsEst: Number(action.hrsEst || action.hours || 10),
          etapas: normalizeSteps(action.etapas || action.steps),
        }
        addProject(project)
        knownProjects.set(name.toLowerCase(), { ...project, hrsReal: 0 })
        setMsgs((m) => [...m, { role: 'ai', text: `Projeto criado: "${name}".` }])
        return true
      }

      if (action.action === 'create_discipline') {
        if (!action.name && !action.title) return false
        const name = String(action.name || action.title).trim()
        const existing = findDiscipline(name)
        if (existing) {
          setMsgs((m) => [...m, { role: 'ai', text: `Essa disciplina já existe: "${existing.name}".` }])
          return true
        }
        const id = addDiscipline({
          name,
          professor: action.professor || '',
          semester: action.semester || '2026/2',
          workload: Number(action.workload || 60),
          status: action.status || 'andamento',
          color: action.color || 'purple',
          desc: action.desc || action.description || '',
          syllabus: action.syllabus || '',
          topics: action.topics || [],
          materials: action.materials || [],
        })
        knownDisciplines.set(name.toLowerCase(), { id, name, topics: action.topics || [] })
        setMsgs((m) => [...m, { role: 'ai', text: `Disciplina criada: "${name}".` }])
        return true
      }

      if (action.action === 'set_discipline_topics') {
        const discipline = findDiscipline(action.disciplineName || action.discipline)
        if (!discipline || !Array.isArray(action.topics)) return false
        replaceTopics(discipline.id, action.topics)
        setMsgs((m) => [...m, { role: 'ai', text: `Tópicos atualizados em "${discipline.name}".` }])
        return true
      }

      if (action.action === 'add_discipline_material') {
        const discipline = findDiscipline(action.disciplineName || action.discipline)
        if (!discipline) return false
        const topic = findTopic(discipline, action.topicName || action.topic)
        addMaterial(discipline.id, {
          title: action.title || 'Material',
          type: action.type || 'texto',
          content: action.content || action.text || '',
          topicId: topic?.id || '',
        })
        setMsgs((m) => [...m, { role: 'ai', text: `Material salvo em "${discipline.name}".` }])
        return true
      }

      if (action.action === 'create_task') {
        if (!action.title) return false
        const project = findProject(action.projectName || action.project)
        const discipline = findDiscipline(action.disciplineName || action.discipline)
        const topic = findTopic(discipline, action.topicName || action.topic)
        addTask({
          title: action.title,
          pri: action.pri || action.priority || 'media',
          status: 'pendente',
          pomo: Number(action.pomo || action.pomodoros || 1),
          projId: project?.id || null,
          desc: action.desc || action.description || 'Criada pelo assistente',
          dueAt: action.dueAt || '',
          scheduledStart: action.scheduledStart || '',
          scheduledEnd: action.scheduledEnd || '',
          disciplineId: discipline?.id || '',
          topicId: topic?.id || '',
        })
        setMsgs((m) => [...m, { role: 'ai', text: `Tarefa criada${project ? ` no projeto "${project.name}"` : ''}: "${action.title}".` }])
        return true
      }

      if (action.action === 'create_event') {
        if (!action.title) return false
        const start = parseDate(action.start || action.scheduledStart, 1)
        const end = parseDate(action.end || action.scheduledEnd, 2)
        addEvent({
          title: action.title,
          start,
          end,
          color: action.color || 'purple',
          type: action.type || 'study',
          disciplineId: findDiscipline(action.disciplineName || action.discipline)?.id || '',
        })
        setMsgs((m) => [...m, { role: 'ai', text: `Evento criado na agenda: "${action.title}".` }])
        return true
      }

      if (action.action === 'create_meta') {
        if (!action.title) return false
        addMeta({
          title: action.title,
          period: action.period || 'dia',
          target: Number(action.target || 1),
          unit: action.unit || 'unidades',
        })
        setMsgs((m) => [...m, { role: 'ai', text: `Meta criada: "${action.title}".` }])
        return true
      }

      if (action.action === 'create_study_session') {
        if (!action.subject && !action.topic) return false
        addStudySession({
          subject: action.subject || 'Geral',
          topic: action.topic || '',
          minutes: Number(action.minutes || 30),
          notes: action.notes || action.text || '',
          disciplineId: findDiscipline(action.disciplineName || action.discipline)?.id || '',
        })
        setMsgs((m) => [...m, { role: 'ai', text: `Sessão de estudo registrada: "${action.subject || action.topic}".` }])
        return true
      }

      if (action.action === 'create_note') {
        if (!action.text && !action.title) return false
        addNote({
          title: action.title || 'Anotação criada pela IA',
          area: action.area || 'Geral',
          text: action.text || '',
          tags: Array.isArray(action.tags) ? action.tags : ['ia'],
          disciplineId: findDiscipline(action.disciplineName || action.discipline)?.id || '',
          topicId: findTopic(findDiscipline(action.disciplineName || action.discipline), action.topicName || action.topic)?.id || '',
        })
        setMsgs((m) => [...m, { role: 'ai', text: `Anotação salva: "${action.title || 'Anotação criada pela IA'}".` }])
        return true
      }

      if (action.action === 'create_legal_note') {
        if (!action.articleId && !action.article) return false
        const sourceType = action.sourceType === 'penalCode' || action.sourceType === 'pena' ? 'penalCode' : 'constitution'
        const articleId = String(action.articleId || action.article).trim()
        setNote(sourceType, articleId, action.text || '')
        setMsgs((m) => [...m, { role: 'ai', text: `Anotação jurídica salva em ${sourceType === 'constitution' ? 'Constituição' : 'Código Penal'} - ${articleId}.` }])
        return true
      }

      if (action.action === 'calculate_penalty') {
        setMsgs((m) => [...m, { role: 'ai', text: penaltyCalc(action) }])
        return true
      }

      return false
    }

    try {
      const reply = await askAI(
        `Assistente jurídico do Legal Flow OS. Data atual ISO: ${today}. Aba atual: "${ctx}". Tarefas recentes: ${taskList || 'nenhuma'}. Projetos existentes: ${projList || 'nenhum'}. Disciplinas existentes: ${disciplineList || 'nenhuma'}.\n\nQuando o usuario pedir para criar, registrar, agendar, salvar anotacao ou calcular algo no app, responda SOMENTE JSON valido, sem markdown, usando uma ou mais destas acoes:\n{"action":"create_discipline","name":"...","professor":"...","semester":"2026/2","workload":60,"status":"planejamento|andamento|revisao|concluida","color":"purple|teal|amber|coral","desc":"...","syllabus":"...","topics":[{"title":"...","objective":"...","date":"","subtopics":["..."],"checklist":["..."]}],"materials":[{"title":"...","type":"texto|link|pdf|bibliografia","content":"..."}]}\n{"action":"set_discipline_topics","disciplineName":"...","topics":[{"title":"...","objective":"...","date":"","subtopics":["..."],"checklist":["..."]}]}\n{"action":"add_discipline_material","disciplineName":"...","topicName":"opcional","title":"...","type":"texto|link|pdf|bibliografia","content":"..."}\n{"action":"create_project","name":"...","desc":"...","color":"purple|teal|amber|coral","hrsEst":10,"etapas":["..."]}\n{"action":"create_task","title":"...","pri":"alta|media|baixa","pomo":1,"projectName":"nome exato do projeto se houver","disciplineName":"nome exato se houver","topicName":"topico se houver","dueAt":"ISO opcional","scheduledStart":"ISO opcional","scheduledEnd":"ISO opcional"}\n{"action":"create_event","title":"...","start":"ISO","end":"ISO","color":"purple|teal|amber|coral","type":"study|practice|review|other","disciplineName":"nome exato se houver"}\n{"action":"create_meta","title":"...","period":"dia|sem|mes","target":1,"unit":"horas|questões|artigos|..."}\n{"action":"create_study_session","subject":"...","disciplineName":"nome exato se houver","topic":"...","minutes":30,"notes":"..."}\n{"action":"create_note","title":"...","area":"Geral|Agenda|Tarefas|Projetos|Metas|Estudos|Constituição|Pena","disciplineName":"nome exato se houver","topicName":"topico se houver","text":"...","tags":["..."]}\n{"action":"create_legal_note","sourceType":"constitution|penalCode","articleId":"art-5","text":"..."}\n{"action":"calculate_penalty","base":0,"agravantes":0,"atenuantes":0,"causasAumento":0,"causasDiminuicao":0}\nSe houver varias acoes, responda um array JSON na ordem de execucao. Nunca apague dados. Se faltar informacao essencial, pergunte em ate 3 frases.\n\nMensagem: ${msg}`,
        'Você é um assistente jurídico e de produtividade integrado ao Legal Flow OS. Seja direto e útil.'
      )
      try {
        const j = JSON.parse(reply.replace(/```json|```/g, '').trim())
        const actions = Array.isArray(j) ? j : [j]
        const handled = actions.map(applyAction).some(Boolean)
        if (handled) {
          return
        }
      } catch {}
      setMsgs((m) => [...m, { role: 'ai', text: reply }])
    } catch (err) {
      setMsgs((m) => [...m, { role: 'ai', text: err.message || 'Erro de conexão com o assistente.' }])
    } finally { setLoading(false) }
  }

  return (
    <div className="absolute bottom-0 right-0">
      {/* Janela */}
      {open && (
        <div className="absolute bottom-14 right-0 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-brand-800">
            <span className="text-sm font-medium text-white">Assistente — {PANEL_TITLES[currentPanel] || 'IA'}</span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-sm">✕</button>
          </div>
          <div ref={msgsRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '220px' }}>
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === 'ai' ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 self-start rounded-tl-none' : 'bg-brand-800 text-white self-end rounded-tr-none ml-auto'}`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="text-xs text-gray-400 px-2">Pensando...</div>}
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100 dark:border-gray-800">
            <input ref={inputRef} className="flex-1 h-8 text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-400"
              placeholder="Digite uma mensagem..." value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button onClick={send} className="w-8 h-8 bg-brand-800 text-white rounded-lg text-sm flex items-center justify-center hover:bg-brand-900">↑</button>
          </div>
        </div>
      )}
      {/* Botão flutuante */}
      <button onClick={() => setOpen(!open)}
        className="w-11 h-11 bg-brand-800 hover:bg-brand-900 text-white rounded-full flex items-center justify-center text-lg shadow-md transition-colors">
        {open ? '✕' : '✦'}
      </button>
    </div>
  )
}
