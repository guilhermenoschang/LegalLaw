import { useEffect, useMemo, useRef, useState } from 'react'
import { useAudioLessonStore, useDisciplineStore, useNotesStore, useStudyStore } from '@/store'
import { askAI } from '@/lib/ai'

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export default function AudioAulas() {
  const { lessons, addLesson, updateLesson, deleteLesson } = useAudioLessonStore()
  const { disciplines } = useDisciplineStore()
  const { addNote } = useNotesStore()
  const { addStudySession, currentSubject } = useStudyStore()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(currentSubject || 'Geral')
  const [disciplineId, setDisciplineId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const recognitionRef = useRef(null)
  const startedAtRef = useRef(null)

  const selected = useMemo(() => lessons.find((lesson) => lesson.id === selectedId), [lessons, selectedId])
  const selectedDiscipline = disciplines.find((discipline) => discipline.id === disciplineId)
  const SpeechRecognition = typeof window !== 'undefined' ? getSpeechRecognition() : null

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 500)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(blob))
      }
      recorder.start()

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = 'pt-BR'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onresult = (event) => {
          let finalText = ''
          let interimText = ''
          for (let i = 0; i < event.results.length; i += 1) {
            const piece = event.results[i][0]?.transcript || ''
            if (event.results[i].isFinal) finalText += `${piece} `
            else interimText += `${piece} `
          }
          setTranscript((current) => {
            const base = current.replace(/\n\nTranscrição parcial:[\s\S]*$/, '').trim()
            const partial = interimText.trim() ? `\n\nTranscrição parcial:\n${interimText.trim()}` : ''
            return `${base}${base && finalText ? ' ' : ''}${finalText.trim()}${partial}`.trim()
          })
        }
        recognition.onerror = () => {}
        recognition.start()
        recognitionRef.current = recognition
      }

      startedAtRef.current = Date.now()
      setElapsed(0)
      setRecording(true)
    } catch {
      alert('Nao foi possivel acessar o microfone. Verifique a permissao do navegador.')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    recognitionRef.current?.stop?.()
    recorderRef.current = null
    recognitionRef.current = null
    setRecording(false)
    setTranscript((current) => current.replace(/\n\nTranscrição parcial:[\s\S]*$/, '').trim())
  }

  const saveLesson = () => {
    const cleanTranscript = transcript.replace(/\n\nTranscrição parcial:[\s\S]*$/, '').trim()
    if (!cleanTranscript && !title.trim()) return
    addLesson({
      title: title.trim() || `Aula - ${new Date().toLocaleDateString('pt-BR')}`,
      subject,
      disciplineId,
      topicId,
      transcript: cleanTranscript,
      duration: elapsed,
    })
    addStudySession({
      subject,
      topic: title.trim() || 'Aula gravada',
      minutes: Math.max(1, Math.round(elapsed / 60)),
      notes: cleanTranscript.slice(0, 500),
      disciplineId,
      topicId,
    })
    setTitle('')
    setTranscript('')
    setElapsed(0)
  }

  const summarize = async (lesson) => {
    if (!lesson.transcript.trim()) return
    setSummarizing(true)
    try {
      const summary = await askAI(
        `Transforme a transcrição abaixo em material de estudo juridico. Separe em: resumo objetivo, pontos cobraveis em prova, duvidas para revisar e 5 perguntas de fixacao.\n\nTranscrição:\n${lesson.transcript}`,
        'Você organiza aulas jurídicas em material de estudo claro, sem inventar conteúdo fora da transcrição.',
        1600
      )
      updateLesson(lesson.id, { summary })
      addNote({
        title: `Resumo - ${lesson.title}`,
        area: 'Estudos',
        text: summary,
        tags: ['audio', 'transcricao', lesson.subject],
        disciplineId: lesson.disciplineId || '',
        topicId: lesson.topicId || '',
      })
    } catch (err) {
      alert(err.message || 'Erro ao resumir aula com IA.')
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="grid grid-cols-[1fr_280px] gap-4 mb-5">
        <div className="panel-hero">
          <span className="eyebrow">Aulas gravadas</span>
          <h2 className="text-xl font-semibold mt-2">Grave, transcreva e transforme aula em revisão.</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">A gravação depende da permissão do microfone. A transcrição automática depende do suporte do navegador e deve ser revisada antes de usar como material final.</p>
        </div>
        <div className="card">
          <div className="text-2xl font-medium text-brand-600">{lessons.length}</div>
          <div className="text-xs text-gray-500">aulas salvas</div>
          <div className="text-xs text-gray-500 mt-3">{SpeechRecognition ? 'Transcrição ao vivo disponível.' : 'Transcrição ao vivo não disponível neste navegador.'}</div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(360px,520px)_1fr] gap-4">
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Nova gravação</h3>
            <span className={`chip ${recording ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{recording ? 'gravando' : formatDuration(elapsed)}</span>
          </div>
          <div><label className="label">Título da aula</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Teoria do crime - conduta" /></div>
          <div><label className="label">Matéria</label><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Disciplina</label><select className="select w-full" value={disciplineId} onChange={(e) => {
              const id = e.target.value
              const discipline = disciplines.find((item) => item.id === id)
              setDisciplineId(id)
              setTopicId('')
              if (discipline) setSubject(discipline.name)
            }}><option value="">Sem vínculo</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></div>
            <div><label className="label">Tópico</label><select className="select w-full" value={topicId} onChange={(e) => setTopicId(e.target.value)}><option value="">Sem tópico</option>{(selectedDiscipline?.topics || []).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></div>
          </div>
          <div><label className="label">Transcrição</label><textarea className="input min-h-[220px] resize-y py-2" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="A transcrição aparece aqui enquanto você grava. Você também pode colar texto manualmente." /></div>
          {audioUrl && <audio className="w-full" src={audioUrl} controls />}
          <div className="flex gap-2">
            {!recording ? <button className="btn-primary flex-1 justify-center" onClick={startRecording}>Iniciar gravação</button> : <button className="btn-secondary flex-1 justify-center text-red-600" onClick={stopRecording}>Parar</button>}
            <button className="btn-secondary flex-1 justify-center" onClick={saveLesson} disabled={recording}>Salvar aula</button>
          </div>
        </section>

        <section className="card">
          <h3 className="text-sm font-medium mb-3">Aulas salvas</h3>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {lessons.length ? lessons.map((lesson) => (
              <div key={lesson.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{lesson.title}</p>
                    <p className="text-xs text-gray-500">{lesson.subject} - {new Date(lesson.createdAt).toLocaleString('pt-BR')}</p>
                    {lesson.disciplineId && <p className="text-xs text-gray-500">{disciplines.find((discipline) => discipline.id === lesson.disciplineId)?.name || 'Disciplina vinculada'}</p>}
                  </div>
                  <button className="text-xs text-gray-300 hover:text-red-400" onClick={() => deleteLesson(lesson.id)}>Excluir</button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">{lesson.transcript || 'Sem transcrição.'}</p>
                <div className="flex gap-2 mt-3">
                  <button className="btn-secondary text-xs" onClick={() => setSelectedId(selectedId === lesson.id ? null : lesson.id)}>{selectedId === lesson.id ? 'Fechar' : 'Abrir'}</button>
                  <button className="btn-primary text-xs" disabled={summarizing || !lesson.transcript} onClick={() => summarize(lesson)}>{summarizing ? 'Resumindo...' : 'Resumir com IA'}</button>
                </div>
                {selectedId === lesson.id && (
                  <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm whitespace-pre-line">
                    <p className="font-medium mb-2">Transcrição</p>
                    <p className="text-gray-700 dark:text-gray-300">{lesson.transcript || 'Sem transcrição.'}</p>
                    {lesson.summary && <>
                      <p className="font-medium mt-4 mb-2">Resumo IA</p>
                      <p className="text-gray-700 dark:text-gray-300">{lesson.summary}</p>
                    </>}
                  </div>
                )}
              </div>
            )) : <p className="text-sm text-gray-400 text-center py-12">Nenhuma aula salva ainda.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
