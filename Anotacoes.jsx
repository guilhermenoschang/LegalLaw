import { useMemo, useState } from 'react'
import { useNotesStore, useLegalSourceStore, useDisciplineStore } from '@/store'

const AREAS = ['Geral', 'Agenda', 'Tarefas', 'Projetos', 'Metas', 'Estudos', 'Constituição', 'Pena']

function NoteEditor({ note, onClose }) {
  const { addNote, updateNote } = useNotesStore()
  const { disciplines } = useDisciplineStore()
  const selectedDiscipline = disciplines.find((discipline) => discipline.id === note?.disciplineId)
  const [form, setForm] = useState(note ? {
    title: note.title,
    area: note.area,
    text: note.text,
    tags: (note.tags || []).join(', '),
    disciplineId: note.disciplineId || '',
    topicId: note.topicId || '',
  } : { title: '', area: 'Geral', text: '', tags: '', disciplineId: '', topicId: '' })
  const discipline = disciplines.find((item) => item.id === form.disciplineId) || selectedDiscipline

  const save = () => {
    if (!form.title.trim() && !form.text.trim()) return
    const payload = {
      title: form.title.trim() || 'Anotação',
      area: form.area,
      text: form.text,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      disciplineId: form.disciplineId,
      topicId: form.topicId,
    }
    note ? updateNote(note.id, payload) : addNote(payload)
    onClose()
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in max-w-2xl">
        <h3 className="text-sm font-medium mb-4">{note ? 'Editar anotação' : 'Nova anotação'}</h3>
        <div className="space-y-3">
          <div><label className="label">Título</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Área</label><select className="select w-full" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>{AREAS.map((area) => <option key={area} value={area}>{area}</option>)}</select></div>
            <div><label className="label">Tags</label><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ex: prova, revisão, dúvida" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Disciplina</label><select className="select w-full" value={form.disciplineId} onChange={(e) => setForm({ ...form, disciplineId: e.target.value, topicId: '' })}><option value="">Sem vínculo</option>{disciplines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div><label className="label">Tópico</label><select className="select w-full" value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })}><option value="">Sem tópico</option>{(discipline?.topics || []).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></div>
          </div>
          <div><label className="label">Conteúdo</label><textarea className="input min-h-[220px] resize-y py-2" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function Anotacoes() {
  const { notes, deleteNote } = useNotesStore()
  const { notes: legalNotes } = useLegalSourceStore()
  const { disciplines } = useDisciplineStore()
  const [area, setArea] = useState('Todas')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)

  const legalNoteItems = useMemo(() => Object.entries(legalNotes || {})
    .filter(([, value]) => value?.text)
    .map(([key, value]) => {
      const [source, article] = key.split(':')
      return {
        id: key,
        title: `${source === 'constitution' ? 'Constituição' : 'Código Penal'} - ${article}`,
        area: source === 'constitution' ? 'Constituição' : 'Pena',
        text: value.text,
        tags: ['texto legal'],
        updatedAt: value.updatedAt,
        legal: true,
      }
    }), [legalNotes])

  const allNotes = [...notes, ...legalNoteItems].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
  const filtered = allNotes.filter((note) => {
    const haystack = `${note.title} ${note.area} ${note.text} ${(note.tags || []).join(' ')}`.toLowerCase()
    return (area === 'Todas' || note.area === area) && (!query.trim() || haystack.includes(query.toLowerCase()))
  })

  return (
    <div className="fade-in">
      <div className="grid grid-cols-[1fr_280px] gap-4 mb-5">
        <div className="panel-hero">
          <span className="eyebrow">Caderno central</span>
          <h2 className="text-xl font-semibold mt-2">Suas anotações ficam em uma área só.</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">Inclui notas livres e notas feitas dentro da Constituição ou do Código Penal, sem apagar o histórico quando a fonte jurídica for atualizada.</p>
        </div>
        <div className="card">
          <div className="text-2xl font-medium text-brand-600">{allNotes.length}</div>
          <div className="text-xs text-gray-500">anotações salvas</div>
          <button className="btn-primary w-full justify-center mt-4" onClick={() => setEditor({})}>+ Anotação</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input className="input max-w-sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar anotações..." />
        <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
          <option>Todas</option>
          {AREAS.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.length ? filtered.map((note) => (
          <article key={note.id} className="card">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="chip bg-brand-50 text-brand-700 border-brand-200 mb-2">{note.area}</span>
                <h3 className="text-sm font-medium">{note.title}</h3>
                {note.disciplineId && <p className="text-xs text-gray-500 mt-1">{disciplines.find((discipline) => discipline.id === note.disciplineId)?.name || 'Disciplina'}{note.topicId ? ` - ${disciplines.find((discipline) => discipline.id === note.disciplineId)?.topics?.find((topic) => topic.id === note.topicId)?.title || 'Tópico'}` : ''}</p>}
              </div>
              {!note.legal && (
                <div className="flex gap-1">
                  <button className="btn-secondary text-xs" onClick={() => setEditor(note)}>Editar</button>
                  <button className="btn-secondary text-xs text-red-500" onClick={() => deleteNote(note.id)}>Excluir</button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line line-clamp-6">{note.text}</p>
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {(note.tags || []).map((tag) => <span key={tag} className="text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5">{tag}</span>)}
            </div>
          </article>
        )) : <div className="card col-span-2 text-sm text-gray-400 text-center py-12">Nenhuma anotação encontrada.</div>}
      </div>

      {editor && <NoteEditor note={editor.id ? editor : null} onClose={() => setEditor(null)} />}
    </div>
  )
}
