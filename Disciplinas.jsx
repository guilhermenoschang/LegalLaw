import { useMemo, useState } from 'react'
import { useAgendaStore, useDisciplineStore, useFlashStore, useNotesStore, useTaskStore, useUIStore } from '@/store'
import { askAIJSON, askAI } from '@/lib/ai'

const COLORS = { purple: '#534AB7', teal: '#1D9E75', amber: '#EF9F27', coral: '#D85A30' }
const STATUS = {
  planejamento: 'Planejamento',
  andamento: 'Em andamento',
  revisao: 'Revisão',
  concluida: 'Concluída',
}
const TOPIC_STATUS = {
  nao_iniciado: 'Não iniciado',
  estudando: 'Estudando',
  revisado: 'Revisado',
  dominado: 'Dominado',
}

function pctDiscipline(discipline) {
  if (!discipline.topics?.length) return 0
  const weights = { nao_iniciado: 0, estudando: 35, revisado: 75, dominado: 100 }
  return Math.round(discipline.topics.reduce((sum, topic) => sum + (weights[topic.status] || 0), 0) / discipline.topics.length)
}

function DisciplineModal({ discipline, onClose }) {
  const { addDiscipline, updateDiscipline } = useDisciplineStore()
  const [form, setForm] = useState(discipline ? {
    name: discipline.name,
    professor: discipline.professor,
    semester: discipline.semester,
    workload: discipline.workload,
    status: discipline.status,
    color: discipline.color,
    desc: discipline.desc,
  } : { name: '', professor: '', semester: '2026/2', workload: 60, status: 'andamento', color: 'purple', desc: '' })

  const save = () => {
    if (!form.name.trim()) return
    const payload = { ...form, workload: Number(form.workload || 0) }
    discipline ? updateDiscipline(discipline.id, payload) : addDiscipline(payload)
    onClose()
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <h3 className="text-sm font-medium mb-4">{discipline ? 'Editar disciplina' : 'Nova disciplina'}</h3>
        <div className="space-y-3">
          <div><label className="label">Nome</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
          <div><label className="label">Professor</label><input className="input" value={form.professor} onChange={(e) => setForm({ ...form, professor: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Semestre</label><input className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></div>
            <div><label className="label">Carga horária</label><input type="number" className="input" value={form.workload} min={1} onChange={(e) => setForm({ ...form, workload: e.target.value })} /></div>
            <div><label className="label">Cor</label><select className="select w-full" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}><option value="purple">Roxo</option><option value="teal">Verde</option><option value="amber">Âmbar</option><option value="coral">Coral</option></select></div>
          </div>
          <div><label className="label">Status</label><select className="select w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Descrição curta</label><textarea className="input h-20 resize-none py-2" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function TopicForm({ discipline }) {
  const { addTopic } = useDisciplineStore()
  const [form, setForm] = useState({ title: '', objective: '', subtopics: '' })
  const save = () => {
    if (!form.title.trim()) return
    addTopic(discipline.id, {
      title: form.title,
      objective: form.objective,
      subtopics: form.subtopics.split('\n'),
    })
    setForm({ title: '', objective: '', subtopics: '' })
  }
  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-medium">Novo tópico</h3>
      <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Prisões cautelares" />
      <textarea className="input h-16 resize-none py-2" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Objetivo do tópico" />
      <textarea className="input h-20 resize-none py-2" value={form.subtopics} onChange={(e) => setForm({ ...form, subtopics: e.target.value })} placeholder={"Subtópicos, um por linha\nConceitos\nArtigos\nJurisprudência"} />
      <button className="btn-primary w-full justify-center" onClick={save}>Adicionar tópico</button>
    </div>
  )
}

function MaterialForm({ discipline }) {
  const { addMaterial } = useDisciplineStore()
  const [form, setForm] = useState({ title: '', type: 'texto', content: '', topicId: '' })
  const save = () => {
    if (!form.title.trim() && !form.content.trim()) return
    addMaterial(discipline.id, form)
    setForm({ title: '', type: 'texto', content: '', topicId: '' })
  }
  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-medium">Material</h3>
      <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do material" />
      <div className="grid grid-cols-2 gap-3">
        <select className="select w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="texto">Texto</option><option value="link">Link</option><option value="pdf">PDF/referência</option><option value="bibliografia">Bibliografia</option></select>
        <select className="select w-full" value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })}><option value="">Sem tópico</option>{discipline.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select>
      </div>
      <textarea className="input h-24 resize-none py-2" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Cole link, trecho, ementa, bibliografia ou referência." />
      <button className="btn-primary w-full justify-center" onClick={save}>Salvar material</button>
    </div>
  )
}

function DisciplineDetail({ discipline, onBack }) {
  const { setSyllabus, replaceTopics, updateTopic, updateDiscipline, deleteDiscipline } = useDisciplineStore()
  const { addTask } = useTaskStore()
  const { addEvent } = useAgendaStore()
  const { addNote } = useNotesStore()
  const { addDeck, addCard } = useFlashStore()
  const { setPanel } = useUIStore()
  const [tab, setTab] = useState('plano')
  const [syllabus, setSyllabusText] = useState(discipline.syllabus || '')
  const [loading, setLoading] = useState('')
  const progress = pctDiscipline(discipline)

  const extractPlan = async () => {
    if (!syllabus.trim()) return
    setLoading('plano')
    try {
      setSyllabus(discipline.id, syllabus)
      const data = await askAIJSON(
        `Leia o plano de aula abaixo e extraia uma estrutura de estudo para a disciplina "${discipline.name}". Retorne SOMENTE JSON valido sem markdown: {"topics":[{"title":"...","objective":"...","date":"","subtopics":["..."],"materials":["..."],"checklist":["..."]}],"exams":["..."]}\n\nPlano:\n${syllabus}`,
        'Você organiza planos de ensino juridicos em topicos objetivos para estudo.'
      )
      replaceTopics(discipline.id, data.topics || [])
      if (Array.isArray(data.exams)) updateDiscipline(discipline.id, { exams: data.exams.map((title) => ({ id: crypto.randomUUID?.() || String(Math.random()), title, date: '', notes: '' })) })
      setTab('topicos')
    } catch (err) {
      alert(err.message || 'Erro ao estruturar plano com IA.')
    } finally {
      setLoading('')
    }
  }

  const generateTasks = () => {
    const tomorrow = new Date(Date.now() + 86400000)
    discipline.topics.forEach((topic, index) => {
      const dueAt = new Date(tomorrow.getTime() + index * 2 * 86400000).toISOString()
      addTask({
        title: `${discipline.name}: estudar ${topic.title}`,
        pri: index < 3 ? 'alta' : 'media',
        status: 'pendente',
        pomo: 2,
        projId: null,
        desc: topic.objective || 'Tarefa gerada pela disciplina',
        dueAt,
        disciplineId: discipline.id,
        topicId: topic.id,
      })
    })
    alert('Tarefas de estudo criadas.')
  }

  const scheduleReviews = () => {
    const base = new Date()
    discipline.topics.slice(0, 10).forEach((topic, index) => {
      const start = new Date(base.getTime() + (index + 1) * 86400000)
      start.setHours(19, 0, 0, 0)
      const end = new Date(start.getTime() + 50 * 60000)
      addEvent({ title: `Revisar ${topic.title}`, start: start.toISOString(), end: end.toISOString(), color: discipline.color, type: 'review', disciplineId: discipline.id, topicId: topic.id })
    })
    alert('Revisões lançadas na agenda.')
  }

  const generateReview = async (topic) => {
    setLoading(topic.id)
    try {
      const text = await askAI(
        `Crie material de revisão para "${topic.title}", da disciplina "${discipline.name}". Use estes subtópicos: ${(topic.subtopics || []).join(', ')}. Entregue resumo, pontos de prova, checklist e 5 perguntas.`,
        'Você cria revisão juridica objetiva para estudo universitario, sem inventar jurisprudencia especifica sem base.',
        1400
      )
      updateTopic(discipline.id, topic.id, { review: text, status: topic.status === 'nao_iniciado' ? 'estudando' : topic.status })
      addNote({ title: `Revisão - ${topic.title}`, area: 'Estudos', text, tags: [discipline.name, topic.title] })
    } catch (err) {
      alert(err.message || 'Erro ao gerar revisão.')
    } finally {
      setLoading('')
    }
  }

  const generateFlashcards = async (topic) => {
    setLoading(`flash-${topic.id}`)
    try {
      const deckName = `${discipline.name} - ${topic.title}`
      const deckId = addDeck({ name: deckName, color: discipline.color })
      const data = await askAIJSON(
        `Gere 8 flashcards sobre "${topic.title}" na disciplina "${discipline.name}". Subtópicos: ${(topic.subtopics || []).join(', ')}. Retorne SOMENTE JSON: {"cards":[{"front":"...","back":"..."}]}`,
        'Você cria flashcards juridicos curtos e confiáveis para revisão.'
      )
      ;(data.cards || []).forEach((card) => addCard(deckId, card))
      setPanel('estudos')
    } catch (err) {
      alert(err.message || 'Erro ao gerar flashcards.')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center gap-3">
        <button className="btn-secondary" onClick={onBack}>← Disciplinas</button>
        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[discipline.color] }} />
        <h2 className="text-base font-medium flex-1">{discipline.name}</h2>
        <button className="btn-secondary text-xs" onClick={() => deleteDiscipline(discipline.id)}>Excluir</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="card"><div className="text-2xl font-medium" style={{ color: COLORS[discipline.color] }}>{progress}%</div><div className="text-xs text-gray-500">progresso</div></div>
        <div className="card"><div className="text-2xl font-medium">{discipline.topics.length}</div><div className="text-xs text-gray-500">tópicos</div></div>
        <div className="card"><div className="text-2xl font-medium">{discipline.materials.length}</div><div className="text-xs text-gray-500">materiais</div></div>
        <div className="card"><div className="text-2xl font-medium">{discipline.workload}h</div><div className="text-xs text-gray-500">carga horária</div></div>
      </div>

      <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-fit">
        {[['plano','Plano'],['topicos','Tópicos'],['materiais','Materiais'],['revisao','Revisão']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 h-8 text-sm ${tab === key ? 'bg-brand-800 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400'}`}>{label}</button>
        ))}
      </div>

      {tab === 'plano' && (
        <div className="grid grid-cols-[1fr_300px] gap-4">
          <div className="card">
            <h3 className="text-sm font-medium mb-3">Plano de aula / ensino</h3>
            <textarea className="input min-h-[360px] resize-y py-3" value={syllabus} onChange={(e) => setSyllabusText(e.target.value)} placeholder="Cole aqui o plano da disciplina, cronograma, ementa, bibliografia, avaliações e datas." />
            <div className="flex gap-2 mt-3">
              <button className="btn-secondary" onClick={() => setSyllabus(discipline.id, syllabus)}>Salvar plano</button>
              <button className="btn-primary" onClick={extractPlan} disabled={loading === 'plano'}>{loading === 'plano' ? 'Estruturando...' : 'IA: extrair tópicos'}</button>
            </div>
          </div>
          <div className="card h-fit">
            <h3 className="text-sm font-medium mb-2">Ações rápidas</h3>
            <div className="space-y-2">
              <button className="btn-primary w-full justify-center" onClick={generateTasks} disabled={!discipline.topics.length}>Criar tarefas</button>
              <button className="btn-secondary w-full justify-center" onClick={scheduleReviews} disabled={!discipline.topics.length}>Agendar revisões</button>
              <button className="btn-secondary w-full justify-center" onClick={() => setPanel('audio')}>Gravar aula</button>
              <button className="btn-secondary w-full justify-center" onClick={() => setPanel('anotacoes')}>Ver anotações</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'topicos' && (
        <div className="grid grid-cols-[1fr_320px] gap-4">
          <div className="space-y-3">
            {discipline.topics.length ? discipline.topics.map((topic) => (
              <div key={topic.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2 mb-2">
                      <span className="chip bg-gray-50 text-gray-600 border-gray-200">{TOPIC_STATUS[topic.status] || topic.status}</span>
                      {topic.date && <span className="chip bg-brand-50 text-brand-700 border-brand-200">{topic.date}</span>}
                    </div>
                    <h3 className="text-sm font-medium">{topic.title}</h3>
                    {topic.objective && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{topic.objective}</p>}
                  </div>
                  <select className="select" value={topic.status} onChange={(e) => updateTopic(discipline.id, topic.id, { status: e.target.value })}>{Object.entries(TOPIC_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </div>
                {!!topic.subtopics?.length && <div className="flex gap-1.5 flex-wrap mt-3">{topic.subtopics.map((sub) => <span key={sub} className="text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded px-2 py-1">{sub}</span>)}</div>}
                <div className="flex gap-2 mt-3">
                  <button className="btn-primary text-xs" disabled={loading === topic.id} onClick={() => generateReview(topic)}>{loading === topic.id ? 'Gerando...' : 'Gerar revisão'}</button>
                  <button className="btn-secondary text-xs" disabled={loading === `flash-${topic.id}`} onClick={() => generateFlashcards(topic)}>Flashcards</button>
                </div>
                {topic.review && <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm whitespace-pre-line text-gray-700 dark:text-gray-300">{topic.review}</div>}
              </div>
            )) : <div className="card text-sm text-gray-400 text-center py-12">Nenhum tópico ainda. Cole o plano e peça para a IA estruturar.</div>}
          </div>
          <TopicForm discipline={discipline} />
        </div>
      )}

      {tab === 'materiais' && (
        <div className="grid grid-cols-[1fr_320px] gap-4">
          <div className="space-y-3">
            {discipline.materials.length ? discipline.materials.map((material) => (
              <div key={material.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="chip bg-gray-50 text-gray-600 border-gray-200 mb-2">{material.type}</span>
                    <h3 className="text-sm font-medium">{material.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mt-2">{material.content}</p>
              </div>
            )) : <div className="card text-sm text-gray-400 text-center py-12">Nenhum material cadastrado.</div>}
          </div>
          <MaterialForm discipline={discipline} />
        </div>
      )}

      {tab === 'revisao' && (
        <div className="card">
          <h3 className="text-sm font-medium mb-3">Cockpit de revisão</h3>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(TOPIC_STATUS).map(([status, label]) => <div key={status} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3"><div className="text-xl font-medium">{discipline.topics.filter((t) => t.status === status).length}</div><div className="text-xs text-gray-500">{label}</div></div>)}
          </div>
          <p className="text-sm text-gray-500 mt-4">Use esta visão para saber o que ainda precisa virar resumo, flashcard ou tarefa antes da prova.</p>
        </div>
      )}
    </div>
  )
}

export default function Disciplinas() {
  const { disciplines } = useDisciplineStore()
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState(null)
  const semester = disciplines[0]?.semester || 'Semestre'
  const totalTopics = disciplines.reduce((sum, discipline) => sum + discipline.topics.length, 0)
  const avgProgress = disciplines.length ? Math.round(disciplines.reduce((sum, discipline) => sum + pctDiscipline(discipline), 0) / disciplines.length) : 0

  const selected = useMemo(() => disciplines.find((discipline) => discipline.id === detail), [disciplines, detail])
  if (selected) return <DisciplineDetail discipline={selected} onBack={() => setDetail(null)} />

  return (
    <div className="fade-in space-y-5">
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="panel-hero">
          <span className="eyebrow">Semestre jurídico</span>
          <h2 className="text-xl font-semibold mt-2">Disciplinas viram plano, tarefas, aulas e revisão.</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">Cadastre as cadeiras do semestre, cole o plano de aula e deixe a IA estruturar os tópicos de estudo sem criar abas soltas.</p>
        </div>
        <div className="card grid grid-cols-3 gap-3 content-center">
          <div><div className="text-2xl font-medium text-brand-600">{disciplines.length}</div><div className="text-xs text-gray-500">disciplinas</div></div>
          <div><div className="text-2xl font-medium">{totalTopics}</div><div className="text-xs text-gray-500">tópicos</div></div>
          <div><div className="text-2xl font-medium">{avgProgress}%</div><div className="text-xs text-gray-500">média</div></div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{semester}</span>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Disciplina</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {disciplines.map((discipline) => {
          const progress = pctDiscipline(discipline)
          return (
            <button key={discipline.id} className="card text-left hover:border-gray-300 dark:hover:border-gray-600 transition-colors" onClick={() => setDetail(discipline.id)}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-3 h-3 rounded-full mt-1" style={{ background: COLORS[discipline.color] }} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium">{discipline.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{discipline.professor || 'Professor não informado'} - {STATUS[discipline.status]}</p>
                </div>
                <span className="text-lg font-medium" style={{ color: COLORS[discipline.color] }}>{progress}%</span>
              </div>
              <div className="progress-bar mb-3"><div className="progress-fill" style={{ width: `${progress}%`, background: COLORS[discipline.color] }} /></div>
              <p className="text-xs text-gray-500 line-clamp-2">{discipline.desc || 'Sem descrição.'}</p>
              <div className="flex gap-4 text-xs text-gray-500 mt-3">
                <span>{discipline.topics.length} tópicos</span>
                <span>{discipline.materials.length} materiais</span>
                <span>{discipline.workload}h</span>
              </div>
            </button>
          )
        })}
      </div>

      {modal && <DisciplineModal onClose={() => setModal(false)} />}
    </div>
  )
}
