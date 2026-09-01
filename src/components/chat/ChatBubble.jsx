import { useState, useRef, useEffect } from 'react'
import { useUIStore, useTaskStore, useProjStore } from '@/store'
import { askAI } from '@/lib/ai'

const PANEL_TITLES = {
  tarefas: 'Tarefas', foco: 'Pomodoro', projetos: 'Projetos', metas: 'Metas',
  constituicao: 'Constituição', quiz: 'Quiz IA', pena: 'Calculadora de Pena',
  agenda: 'Agenda', estudos: 'Estudos', dashboard: 'Dashboard',
}

export default function ChatBubble() {
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState([{ role: 'ai', text: 'Olá! Sou seu assistente jurídico. Posso criar tarefas, explicar artigos, gerar questões e ajudar com o que precisar.' }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef(null)
  const { currentPanel } = useUIStore()
  const { tasks, addTask } = useTaskStore()
  const { projects }      = useProjStore()

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [msgs])

  const send = async () => {
    const msg = input.trim(); if (!msg || loading) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: msg }])
    setLoading(true)

    const ctx = PANEL_TITLES[currentPanel] || currentPanel
    const taskList = tasks.slice(0, 5).map((t) => `"${t.title}" (${t.status})`).join(', ')
    const projList = projects.map((p) => p.name).join(', ')

    try {
      const reply = await askAI(
        `Assistente jurídico do Legal Flow OS. Aba atual: "${ctx}". Tarefas recentes: ${taskList}. Projetos: ${projList}.\n\nSe o usuário pedir para criar tarefa, responda SOMENTE JSON: {"action":"create_task","title":"...","pri":"alta|media|baixa","pomo":1}\nCaso contrário responda normalmente em até 3 frases diretas.\n\nMensagem: ${msg}`,
        'Você é um assistente jurídico e de produtividade integrado ao Legal Flow OS. Seja direto e útil.'
      )
      try {
        const j = JSON.parse(reply.replace(/```json|```/g, '').trim())
        if (j.action === 'create_task') {
          addTask({ title: j.title, pri: j.pri || 'media', status: 'pendente', pomo: j.pomo || 1, projId: null, desc: 'Criada pelo assistente' })
          setMsgs((m) => [...m, { role: 'ai', text: `✓ Tarefa criada: "${j.title}"` }])
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
            <input className="flex-1 h-8 text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 bg-white dark:bg-gray-800 focus:outline-none focus:border-brand-400"
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
