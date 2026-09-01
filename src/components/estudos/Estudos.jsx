import { useState } from 'react'
import { useFlashStore, useStudyStore } from '@/store'
import { askAI, askAIJSON } from '@/lib/ai'

const COLORS = {
  purple: 'bg-brand-100 text-brand-800 border-brand-200',
  coral:  'bg-orange-100 text-orange-800 border-orange-200',
  teal:   'bg-teal-100 text-teal-800 border-teal-200',
  amber:  'bg-amber-100 text-amber-800 border-amber-200',
}
const DOT = {
  purple: 'bg-brand-600', coral: 'bg-orange-500', teal: 'bg-teal-600', amber: 'bg-amber-500',
}

/* ── Modo de estudo com flashcard ── */
function StudyMode({ deck, onClose }) {
  const { updateCardLevel } = useFlashStore()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const cards = deck.cards

  if (done || !cards.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-4xl">🎉</div>
        <p className="text-lg font-medium">Deck concluído!</p>
        <p className="text-sm text-gray-500">{cards.length} carta{cards.length !== 1 ? 's' : ''} revisada{cards.length !== 1 ? 's' : ''}</p>
        <button className="btn-primary" onClick={onClose}>Voltar aos decks</button>
      </div>
    )
  }

  const card = cards[idx]
  const next = (level) => {
    updateCardLevel(deck.id, card.id, level)
    if (idx + 1 >= cards.length) setDone(true)
    else { setIdx(idx + 1); setFlipped(false) }
  }

  return (
    <div className="fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary" onClick={onClose}>← Voltar</button>
        <span className="text-sm text-gray-500">{idx + 1} / {cards.length}</span>
        <div className="flex-1 progress-bar"><div className="progress-fill bg-brand-600" style={{ width: `${((idx + 1) / cards.length) * 100}%` }} /></div>
      </div>

      {/* Card flip */}
      <div className="flex justify-center mb-6">
        <div
          className="w-full max-w-xl cursor-pointer"
          style={{ perspective: '800px' }}
          onClick={() => setFlipped(!flipped)}
        >
          <div className={`relative transition-transform duration-300`} style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)' }}>
            {/* Frente */}
            <div className="card min-h-[200px] flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: 'hidden' }}>
              <span className="text-xs text-gray-400 mb-4 uppercase tracking-wide">Pergunta</span>
              <p className="text-base font-medium text-gray-800 dark:text-gray-200">{card.front}</p>
              <p className="text-xs text-gray-400 mt-6">Clique para revelar</p>
            </div>
            {/* Verso */}
            <div className="card min-h-[200px] flex flex-col items-center justify-center p-8 text-center absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <span className="text-xs text-brand-600 mb-4 uppercase tracking-wide">Resposta</span>
              <p className="text-base text-gray-800 dark:text-gray-200">{card.back}</p>
            </div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-3 justify-center">
          <button onClick={() => next(0)} className="flex-1 max-w-[120px] h-10 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm hover:bg-red-100 transition-colors">
            Não sei 😕
          </button>
          <button onClick={() => next(1)} className="flex-1 max-w-[120px] h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm hover:bg-amber-100 transition-colors">
            Quase 🤔
          </button>
          <button onClick={() => next(2)} className="flex-1 max-w-[120px] h-10 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm hover:bg-green-100 transition-colors">
            Sabia! ✓
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Gerador de flashcards via IA ── */
function AIGenerator({ deckId, onClose }) {
  const { addCard } = useFlashStore()
  const [topic, setTopic] = useState('')
  const [qty, setQty] = useState(5)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const result = await askAIJSON(
        `Gere ${qty} flashcards de estudo jurídico sobre: "${topic}". Retorne SOMENTE JSON válido sem markdown: {"cards":[{"front":"pergunta curta","back":"resposta completa mas concisa"}]}`
      )
      result.cards.forEach((c) => addCard(deckId, c))
      onClose()
    } catch (e) {
      alert(e.message || 'Erro ao gerar flashcards.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <h3 className="text-sm font-medium mb-4">✦ Gerar flashcards com IA</h3>
        <div className="space-y-3">
          <div><label className="label">Tema jurídico</label><input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Princípios do Direito Administrativo" autoFocus /></div>
          <div><label className="label">Quantidade</label>
            <select className="select w-full" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
              <option value={3}>3 flashcards</option><option value={5}>5 flashcards</option><option value={10}>10 flashcards</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 justify-center" onClick={generate} disabled={loading}>
            {loading ? 'Gerando...' : '✦ Gerar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Cronograma IA ── */
function Cronograma() {
  const [concurso, setConcurso] = useState('')
  const [horasDia, setHorasDia] = useState(3)
  const [semanas, setSemanas] = useState(8)
  const [resultado, setResultado] = useState('')
  const [loading, setLoading] = useState(false)

  const gerar = async () => {
    if (!concurso.trim()) return
    setLoading(true)
    try {
      const res = await askAI(
        `Crie um cronograma de estudos para o concurso/exame: "${concurso}". O aluno tem ${horasDia}h/dia disponíveis e ${semanas} semanas até a prova. Liste as matérias com % de peso, horas semanais sugeridas e dicas de estudo. Formato: texto organizado em seções, sem markdown excessivo.`,
        'Você é um professor especialista em concursos jurídicos. Seja prático e direto.'
      )
      setResultado(res)
    } catch {
      setResultado('Erro ao gerar cronograma. Verifique a configuracao server-side da IA.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium mb-4">✦ Gerar cronograma com IA</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="col-span-3"><label className="label">Concurso / Exame</label><input className="input" value={concurso} onChange={(e) => setConcurso(e.target.value)} placeholder="Ex: OAB 1ª Fase, Delegado SP, Magistratura..." /></div>
        <div><label className="label">Horas por dia</label><input type="number" className="input" value={horasDia} min={1} max={12} onChange={(e) => setHorasDia(Number(e.target.value))} /></div>
        <div><label className="label">Semanas até prova</label><input type="number" className="input" value={semanas} min={1} max={52} onChange={(e) => setSemanas(Number(e.target.value))} /></div>
        <div className="flex items-end"><button className="btn-primary w-full justify-center" onClick={gerar} disabled={loading}>{loading ? 'Gerando...' : '✦ Gerar'}</button></div>
      </div>
      {resultado && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
          {resultado}
        </div>
      )}
    </div>
  )
}

export default function Estudos() {
  const { decks, addDeck, deleteDeck } = useFlashStore()
  const { sessions, currentSubject, addStudySession, setCurrentSubject } = useStudyStore()
  const [studyDeck, setStudyDeck] = useState(null)
  const [aiGen, setAIGen] = useState(null)
  const [newDeckName, setNewDeckName] = useState('')
  const [tab, setTab] = useState('flashcards')
  const [sessionForm, setSessionForm] = useState({ subject: currentSubject, topic: '', minutes: 30, notes: '' })

  const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0)
  const todayMinutes = sessions
    .filter((session) => new Date(session.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, session) => sum + Number(session.minutes || 0), 0)
  const lastSession = sessions[0]

  if (studyDeck) {
    return <StudyMode deck={studyDeck} onClose={() => setStudyDeck(null)} />
  }

  return (
    <div className="fade-in">
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-4 mb-5">
        <div className="panel-hero">
          <span className="eyebrow">Plano de estudo</span>
          <h2 className="text-xl font-semibold mt-2">Continue exatamente de onde parou.</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            Registre materia, tema, tempo e observacoes. Esse historico entra na sincronizacao do usuario e alimenta a proxima sessao de estudo.
          </p>
        </div>
        <div className="card grid grid-cols-3 gap-3 content-center">
          <div><div className="text-2xl font-medium text-brand-600">{Math.round(todayMinutes / 60 * 10) / 10}h</div><div className="text-xs text-gray-500">hoje</div></div>
          <div><div className="text-2xl font-medium">{Math.round(totalMinutes / 60 * 10) / 10}h</div><div className="text-xs text-gray-500">total</div></div>
          <div><div className="text-2xl font-medium">{sessions.length}</div><div className="text-xs text-gray-500">sessoes</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-fit mb-5">
        {[['flashcards','Flashcards'],['registro','Continuar estudo'],['cronograma','Cronograma IA']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 h-8 text-sm transition-colors ${tab === k ? 'bg-brand-800 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400'}`}>{l}</button>
        ))}
      </div>

      {tab === 'flashcards' && (
        <>
          {/* Criar deck */}
          <div className="flex gap-2 mb-5">
            <input className="input flex-1" placeholder="Nome do novo deck..." value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newDeckName.trim()) { addDeck({ name: newDeckName.trim(), color: 'purple' }); setNewDeckName('') } }} />
            <button className="btn-primary" onClick={() => { if (newDeckName.trim()) { addDeck({ name: newDeckName.trim(), color: 'purple' }); setNewDeckName('') } }}>+ Deck</button>
          </div>

          {/* Decks */}
          <div className="grid grid-cols-2 gap-4">
            {decks.map((deck) => {
              const due = deck.cards.filter((c) => c.level === 0).length
              return (
                <div key={deck.id} className="card hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${DOT[deck.color] || DOT.purple}`} />
                      <span className="text-sm font-medium">{deck.name}</span>
                    </div>
                    <button onClick={() => deleteDeck(deck.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 mb-4">
                    <span>📇 {deck.cards.length} cartas</span>
                    <span className="text-amber-600">{due} para revisar</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1 justify-center text-xs" onClick={() => setStudyDeck(deck)}>▶ Estudar</button>
                    <button className="btn-secondary flex-1 justify-center text-xs" onClick={() => setAIGen(deck.id)}>✦ IA</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'registro' && (
        <div className="grid grid-cols-[minmax(320px,420px)_1fr] gap-4">
          <div className="card space-y-3">
            <h3 className="text-sm font-medium">Registrar sessao</h3>
            <div><label className="label">Materia</label><input className="input" value={sessionForm.subject} onChange={(e) => setSessionForm({ ...sessionForm, subject: e.target.value })} /></div>
            <div><label className="label">Tema estudado</label><input className="input" value={sessionForm.topic} onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })} placeholder="Ex: controle de constitucionalidade" /></div>
            <div><label className="label">Tempo em minutos</label><input type="number" className="input" min={5} value={sessionForm.minutes} onChange={(e) => setSessionForm({ ...sessionForm, minutes: Number(e.target.value) || 0 })} /></div>
            <div><label className="label">Notas rapidas</label><textarea className="input h-24 resize-none" value={sessionForm.notes} onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })} /></div>
            <button className="btn-primary w-full justify-center" onClick={() => {
              if (!sessionForm.subject.trim()) return
              addStudySession(sessionForm)
              setCurrentSubject(sessionForm.subject)
              setSessionForm({ ...sessionForm, topic: '', notes: '' })
            }}>Salvar estudo</button>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium mb-3">Historico recente</h3>
            {lastSession && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-800 p-3 mb-3">
                <p className="text-xs text-brand-700 font-medium">Ultimo ponto</p>
                <p className="text-sm mt-1">{lastSession.subject} - {lastSession.topic || 'sem tema informado'}</p>
              </div>
            )}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sessions.length ? sessions.slice(0, 12).map((session) => (
                <div key={session.id} className="border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{session.subject}</span>
                    <span className="text-gray-400 text-xs">{session.minutes} min</span>
                  </div>
                  <p className="text-xs text-gray-500">{session.topic || 'Tema nao informado'} - {new Date(session.createdAt).toLocaleString('pt-BR')}</p>
                  {session.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{session.notes}</p>}
                </div>
              )) : <p className="text-sm text-gray-400">Nenhuma sessao registrada ainda.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'cronograma' && <Cronograma />}

      {aiGen && <AIGenerator deckId={aiGen} onClose={() => setAIGen(null)} />}
    </div>
  )
}
