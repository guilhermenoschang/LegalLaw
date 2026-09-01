import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ─── helpers ──────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10)

/* ─── UI STORE ─────────────────────────────── */
export const useUIStore = create(persist(
  (set) => ({
    currentPanel: 'dashboard',
    sidebarCollapsed: false,
    darkMode: false,
    setPanel: (p) => set({ currentPanel: p }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  }),
  { name: 'lf-ui' }
))

/* ─── TASKS STORE ──────────────────────────── */
export const useTaskStore = create(persist(
  (set, get) => ({
    tasks: [
      { id: uid(), title: 'Revisar Art. 5° — Direitos Fundamentais', pri: 'alta', status: 'andamento', pomo: 2, projId: null, desc: '', dueAt: new Date(Date.now() + 3600000 * 3).toISOString(), scheduledStart: new Date(Date.now() + 3600000 * 2).toISOString(), scheduledEnd: new Date(Date.now() + 3600000 * 3).toISOString(), subs: [{ id: uid(), t: 'Ler doutrina Barroso', done: true }, { id: uid(), t: 'Fichamento dos incisos', done: false }], createdAt: Date.now() },
      { id: uid(), title: 'Questões de Direito Penal', pri: 'media', status: 'pendente', pomo: 3, projId: null, desc: '', dueAt: new Date(Date.now() + 3600000 * 7).toISOString(), scheduledStart: new Date(Date.now() + 3600000 * 6).toISOString(), scheduledEnd: new Date(Date.now() + 3600000 * 7.5).toISOString(), subs: [], createdAt: Date.now() },
      { id: uid(), title: 'Memorizar LIMPE', pri: 'alta', status: 'pendente', pomo: 1, projId: null, desc: 'Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência', dueAt: new Date(Date.now() + 86400000).toISOString(), scheduledStart: '', scheduledEnd: '', subs: [], createdAt: Date.now() },
      { id: uid(), title: 'Caso prático — Processo Civil', pri: 'baixa', status: 'concluida', pomo: 4, projId: null, desc: '', subs: [], createdAt: Date.now() },
    ],
    addTask: (data) => set((s) => ({ tasks: [{ id: uid(), ...data, dueAt: data.dueAt || '', scheduledStart: data.scheduledStart || '', scheduledEnd: data.scheduledEnd || '', subs: [], createdAt: Date.now() }, ...s.tasks] })),
    updateTask: (id, data) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...data } : t) })),
    deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    toggleDone: (id) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status: t.status === 'concluida' ? 'pendente' : 'concluida' } : t) })),
    addSub: (taskId, text) => set((s) => ({ tasks: s.tasks.map((t) => t.id === taskId ? { ...t, subs: [...t.subs, { id: uid(), t: text, done: false }] } : t) })),
    toggleSub: (taskId, subId) => set((s) => ({ tasks: s.tasks.map((t) => t.id === taskId ? { ...t, subs: t.subs.map((s) => s.id === subId ? { ...s, done: !s.done } : s) } : t) })),
  }),
  { name: 'lf-tasks' }
))

/* ─── PROJECTS STORE ───────────────────────── */
export const useProjStore = create(persist(
  (set, get) => ({
    projects: [
      { id: 'p1', name: 'Revisão OAB — Constitucional', desc: 'Foco nos direitos fundamentais', color: 'purple', hrsEst: 20, hrsReal: 6, etapas: [{ id: uid(), t: 'Leitura do material', done: true }, { id: uid(), t: 'Resolução de questões', done: false }, { id: uid(), t: 'Revisão final', done: false }], createdAt: Date.now() },
      { id: 'p2', name: 'Concurso TRF — Administrativo', desc: 'Princípios e atos administrativos', color: 'teal', hrsEst: 15, hrsReal: 4, etapas: [{ id: uid(), t: 'Leitura doutrina', done: true }, { id: uid(), t: 'Jurisprudência', done: false }], createdAt: Date.now() },
    ],
    addProject: (data) => set((s) => ({ projects: [...s.projects, { id: uid(), ...data, hrsReal: 0, etapas: (data.etapas || []).map((t) => ({ id: uid(), t, done: false })), createdAt: Date.now() }] })),
    updateProject: (id, data) => set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...data } : p) })),
    deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
    toggleEtapa: (projId, etapaId) => set((s) => ({ projects: s.projects.map((p) => p.id === projId ? { ...p, etapas: p.etapas.map((e) => e.id === etapaId ? { ...e, done: !e.done } : e) } : p) })),
    addHoras: (projId, hrs) => set((s) => ({ projects: s.projects.map((p) => p.id === projId ? { ...p, hrsReal: p.hrsReal + hrs } : p) })),
  }),
  { name: 'lf-projects' }
))

/* ─── METAS STORE ──────────────────────────── */
export const useMetaStore = create(persist(
  (set) => ({
    metas: [
      { id: uid(), title: 'Estudar 2h por dia', period: 'dia', target: 2, current: 1.5, unit: 'horas' },
      { id: uid(), title: 'Resolver 50 questões', period: 'sem', target: 50, current: 22, unit: 'questões' },
      { id: uid(), title: 'Revisar 10 artigos da CF', period: 'mes', target: 10, current: 4, unit: 'artigos' },
    ],
    addMeta: (data) => set((s) => ({ metas: [...s.metas, { id: uid(), ...data, current: 0 }] })),
    updateMeta: (id, data) => set((s) => ({ metas: s.metas.map((m) => m.id === id ? { ...m, ...data } : m) })),
    deleteMeta: (id) => set((s) => ({ metas: s.metas.filter((m) => m.id !== id) })),
    incMeta: (id, delta) => set((s) => ({ metas: s.metas.map((m) => m.id === id ? { ...m, current: Math.max(0, m.current + delta) } : m) })),
  }),
  { name: 'lf-metas' }
))

/* ─── POMODORO STORE ───────────────────────── */
export const usePomoStore = create(persist(
  (set, get) => ({
    mode: 'work',
    running: false,
    left: 25 * 60,
    total: 25 * 60,
    cycles: 0,
    activeTaskId: null,
    history: [],
    doneToday: 0,
    goal: 8,
    sound: 'silence',
    vol: 40,
    cfg: { work: 25, short: 5, long: 15, cycles: 4 },
    setMode: (mode) => {
      const { cfg } = get()
      const times = { work: cfg.work * 60, short: cfg.short * 60, long: cfg.long * 60 }
      set({ mode, left: times[mode], total: times[mode], running: false })
    },
    tick: () => set((s) => ({ left: Math.max(0, s.left - 1) })),
    setRunning: (v) => set({ running: v }),
    setActiveTask: (id) => set({ activeTaskId: id }),
    completeCycle: (taskTitle) => set((s) => {
      const newHistory = [{ label: taskTitle || 'Sessão livre', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }, ...s.history].slice(0, 20)
      return { doneToday: s.doneToday + 1, history: newHistory, cycles: s.cycles + 1 }
    }),
    setCfg: (cfg) => set({ cfg }),
    setSound: (sound) => set({ sound }),
    setVol: (vol) => set({ vol }),
    setGoal: (goal) => set({ goal }),
    resetTimer: () => {
      const { cfg, mode } = get()
      const times = { work: cfg.work * 60, short: cfg.short * 60, long: cfg.long * 60 }
      set({ left: times[mode], total: times[mode], running: false })
    },
  }),
  { name: 'lf-pomo', partialize: (s) => ({ cfg: s.cfg, goal: s.goal, sound: s.sound, vol: s.vol, doneToday: s.doneToday, history: s.history }) }
))

/* ─── FLASHCARDS STORE ─────────────────────── */
export const useFlashStore = create(persist(
  (set) => ({
    decks: [
      {
        id: 'deck1', name: 'Princípios Constitucionais', color: 'purple',
        cards: [
          { id: uid(), front: 'O que é o princípio da legalidade?', back: 'Ninguém é obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei (Art. 5°, II, CF).', level: 0 },
          { id: uid(), front: 'Quais são os princípios do LIMPE?', back: 'Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência (Art. 37, CF).', level: 0 },
          { id: uid(), front: 'O que garante o Art. 5°, LV?', back: 'Aos litigantes são assegurados o contraditório e a ampla defesa, com os meios e recursos a ela inerentes.', level: 1 },
        ]
      },
      {
        id: 'deck2', name: 'Direito Penal — Parte Geral', color: 'coral',
        cards: [
          { id: uid(), front: 'O que é dolo direto?', back: 'Age com dolo direto quem quer o resultado (Art. 18, I, CP).', level: 0 },
          { id: uid(), front: 'Diferença entre crime consumado e tentado?', back: 'Consumado: todos os elementos do tipo estão presentes. Tentado: interrompido por circunstâncias alheias à vontade do agente (Art. 14, CP).', level: 0 },
        ]
      },
    ],
    addDeck: (data) => set((s) => ({ decks: [...s.decks, { id: uid(), ...data, cards: [] }] })),
    addCard: (deckId, card) => set((s) => ({ decks: s.decks.map((d) => d.id === deckId ? { ...d, cards: [...d.cards, { id: uid(), ...card, level: 0 }] } : d) })),
    updateCardLevel: (deckId, cardId, level) => set((s) => ({ decks: s.decks.map((d) => d.id === deckId ? { ...d, cards: d.cards.map((c) => c.id === cardId ? { ...c, level } : c) } : d) })),
    deleteDeck: (id) => set((s) => ({ decks: s.decks.filter((d) => d.id !== id) })),
  }),
  { name: 'lf-flash' }
))

/* ─── AGENDA STORE ─────────────────────────── */
export const useAgendaStore = create(persist(
  (set) => ({
    events: [
      { id: uid(), title: 'Revisão Direito Constitucional', start: new Date(Date.now() + 3600000 * 2).toISOString(), end: new Date(Date.now() + 3600000 * 4).toISOString(), color: 'purple', type: 'study' },
      { id: uid(), title: 'Questões Direito Penal', start: new Date(Date.now() + 3600000 * 6).toISOString(), end: new Date(Date.now() + 3600000 * 7).toISOString(), color: 'coral', type: 'practice' },
    ],
    gcalConnected: false,
    addEvent: (ev) => set((s) => ({ events: [...s.events, { id: uid(), ...ev }] })),
    updateEvent: (id, data) => set((s) => ({ events: s.events.map((e) => e.id === id ? { ...e, ...data } : e) })),
    deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
    setGcalConnected: (v) => set({ gcalConnected: v }),
  }),
  { name: 'lf-agenda' }
))

/* ─── ESTUDOS STORE ───────────────────────── */
export const useStudyStore = create(persist(
  (set) => ({
    sessions: [],
    currentSubject: 'Direito Constitucional',
    addStudySession: (data) => set((s) => ({
      sessions: [{ id: uid(), createdAt: Date.now(), ...data }, ...s.sessions].slice(0, 300),
      currentSubject: data.subject || s.currentSubject,
    })),
    setCurrentSubject: (subject) => set({ currentSubject: subject }),
  }),
  { name: 'lf-study' }
))

/* ─── FONTES JURIDICAS STORE ──────────────── */
export const useLegalSourceStore = create(persist(
  (set, get) => ({
    constitution: null,
    penalCode: null,
    notes: {},
    favorites: {},
    updateSource: async (type) => {
      const res = await fetch(`/api/legal-source?type=${encodeURIComponent(type)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar fonte.')
      set(type === 'constitution' ? { constitution: data } : { penalCode: data })
      return data
    },
    setNote: (sourceType, articleId, text) => set((s) => ({
      notes: {
        ...s.notes,
        [`${sourceType}:${articleId}`]: {
          text,
          updatedAt: Date.now(),
        },
      },
    })),
    toggleFavorite: (sourceType, articleId) => set((s) => {
      const key = `${sourceType}:${articleId}`
      return { favorites: { ...s.favorites, [key]: !s.favorites[key] } }
    }),
    getNote: (sourceType, articleId) => get().notes[`${sourceType}:${articleId}`]?.text || '',
  }),
  { name: 'lf-legal-sources' }
))

export function getAppStateSnapshot() {
  return {
    version: 1,
    tasks: useTaskStore.getState().tasks,
    projects: useProjStore.getState().projects,
    metas: useMetaStore.getState().metas,
    pomo: {
      cfg: usePomoStore.getState().cfg,
      goal: usePomoStore.getState().goal,
      sound: usePomoStore.getState().sound,
      vol: usePomoStore.getState().vol,
      doneToday: usePomoStore.getState().doneToday,
      history: usePomoStore.getState().history,
    },
    decks: useFlashStore.getState().decks,
    events: useAgendaStore.getState().events,
    sessions: useStudyStore.getState().sessions,
    currentSubject: useStudyStore.getState().currentSubject,
    legalSources: {
      constitution: useLegalSourceStore.getState().constitution,
      penalCode: useLegalSourceStore.getState().penalCode,
      notes: useLegalSourceStore.getState().notes,
      favorites: useLegalSourceStore.getState().favorites,
    },
  }
}

export function hydrateAppState(state) {
  if (!state) return
  if (Array.isArray(state.tasks)) useTaskStore.setState({ tasks: state.tasks })
  if (Array.isArray(state.projects)) useProjStore.setState({ projects: state.projects })
  if (Array.isArray(state.metas)) useMetaStore.setState({ metas: state.metas })
  if (state.pomo) usePomoStore.setState({
    cfg: state.pomo.cfg || usePomoStore.getState().cfg,
    goal: state.pomo.goal ?? usePomoStore.getState().goal,
    sound: state.pomo.sound || usePomoStore.getState().sound,
    vol: state.pomo.vol ?? usePomoStore.getState().vol,
    doneToday: state.pomo.doneToday ?? usePomoStore.getState().doneToday,
    history: Array.isArray(state.pomo.history) ? state.pomo.history : usePomoStore.getState().history,
  })
  if (Array.isArray(state.decks)) useFlashStore.setState({ decks: state.decks })
  if (Array.isArray(state.events)) useAgendaStore.setState({ events: state.events })
  if (Array.isArray(state.sessions)) useStudyStore.setState({ sessions: state.sessions })
  if (state.currentSubject) useStudyStore.setState({ currentSubject: state.currentSubject })
  if (state.legalSources) useLegalSourceStore.setState({
    constitution: state.legalSources.constitution || useLegalSourceStore.getState().constitution,
    penalCode: state.legalSources.penalCode || useLegalSourceStore.getState().penalCode,
    notes: state.legalSources.notes || useLegalSourceStore.getState().notes,
    favorites: state.legalSources.favorites || useLegalSourceStore.getState().favorites,
  })
}

export function subscribeToAppState(listener) {
  const unsubscribers = [
    useTaskStore.subscribe(listener),
    useProjStore.subscribe(listener),
    useMetaStore.subscribe(listener),
    usePomoStore.subscribe(listener),
    useFlashStore.subscribe(listener),
    useAgendaStore.subscribe(listener),
    useStudyStore.subscribe(listener),
    useLegalSourceStore.subscribe(listener),
  ]

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}
