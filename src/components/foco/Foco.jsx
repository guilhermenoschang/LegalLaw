import { useEffect, useRef } from 'react'
import { usePomoStore, useTaskStore, useUIStore } from '@/store'

const CIRC = 478

function useSoundEngine(sound, vol, running) {
  const ctxRef  = useRef(null)
  const gainRef = useRef(null)
  const nodesRef = useRef([])
  const timersRef = useRef([])

  const stop = () => {
    timersRef.current.forEach((timer) => window.clearInterval(timer))
    timersRef.current = []
    if (gainRef.current) {
      try { gainRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.1) } catch {}
    }
    const nodes = nodesRef.current
    nodesRef.current = []
    window.setTimeout(() => {
      nodes.forEach((node) => {
        try { node.stop?.() } catch {}
        try { node.disconnect?.() } catch {}
      })
    }, 250)
  }

  const createNoise = (ctx, seconds = 4, amount = 0.35) => {
    const buf = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * amount
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    return src
  }

  const connectRain = (ctx, destination) => {
    const rain = createNoise(ctx, 5, 0.55)
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 1700
    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.value = 450
    rain.connect(high)
    high.connect(low)
    low.connect(destination)
    rain.start()
    nodesRef.current.push(rain, high, low)
  }

  const connectCafe = (ctx, destination) => {
    const room = createNoise(ctx, 6, 0.18)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 520
    filter.Q.value = 0.7
    room.connect(filter)
    filter.connect(destination)
    room.start()
    nodesRef.current.push(room, filter)

    const tick = () => {
      const clickGain = ctx.createGain()
      clickGain.gain.value = 0.025 + Math.random() * 0.035
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = 160 + Math.random() * 420
      osc.connect(clickGain)
      clickGain.connect(destination)
      const now = ctx.currentTime
      clickGain.gain.setTargetAtTime(0, now + 0.03, 0.05)
      osc.start(now)
      osc.stop(now + 0.18)
      nodesRef.current.push(osc, clickGain)
    }
    timersRef.current.push(window.setInterval(tick, 900 + Math.random() * 700))
  }

  const connectLofi = (ctx, destination) => {
    const freqs = [196, 246.94, 293.66, 329.63]
    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const chordGain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = index % 2 ? 'triangle' : 'sine'
      osc.frequency.value = freq
      chordGain.gain.value = 0.025
      filter.type = 'lowpass'
      filter.frequency.value = 900
      osc.connect(filter)
      filter.connect(chordGain)
      chordGain.connect(destination)
      osc.start()
      nodesRef.current.push(osc, chordGain, filter)
    })

    const vinyl = createNoise(ctx, 3, 0.06)
    const vinylFilter = ctx.createBiquadFilter()
    vinylFilter.type = 'highpass'
    vinylFilter.frequency.value = 2200
    vinyl.connect(vinylFilter)
    vinylFilter.connect(destination)
    vinyl.start()
    nodesRef.current.push(vinyl, vinylFilter)
  }

  const start = () => {
    stop()
    if (sound === 'silence') return
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = ctxRef.current
    ctx.resume?.()
    gainRef.current = ctx.createGain()
    gainRef.current.gain.value = (vol / 100) * 0.45
    gainRef.current.connect(ctx.destination)

    if (sound === 'rain') connectRain(ctx, gainRef.current)
    if (sound === 'cafe') connectCafe(ctx, gainRef.current)
    if (sound === 'lofi') connectLofi(ctx, gainRef.current)
  }

  useEffect(() => {
    if (running) start()
    else stop()
    return stop
  }, [running, sound])

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = (vol / 100) * 0.45
  }, [vol])
}

export default function Foco() {
  const pomo = usePomoStore()
  const { tasks } = useTaskStore()
  const { setPanel } = useUIStore()
  const intervalRef = useRef(null)

  useSoundEngine(pomo.sound, pomo.vol, pomo.running)

  // Tick
  useEffect(() => {
    if (pomo.running) {
      intervalRef.current = setInterval(() => {
        if (pomo.left <= 0) { handleEnd(); return }
        pomo.tick()
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [pomo.running, pomo.left])

  const handleEnd = () => {
    pomo.setRunning(false)
    if (pomo.mode === 'work') {
      const t = tasks.find((x) => x.id === pomo.activeTaskId)
      pomo.completeCycle(t?.title)
      pomo.cycles >= pomo.cfg.cycles - 1 ? pomo.setMode('long') : pomo.setMode('short')
    } else {
      pomo.setMode('work')
    }
  }

  const toggle = () => pomo.setRunning(!pomo.running)

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const pct  = pomo.total > 0 ? pomo.left / pomo.total : 1
  const offset = Math.round(CIRC * (1 - pct))
  const activeTask = tasks.find((t) => t.id === pomo.activeTaskId)
  const completedPct = Math.round((1 - pct) * 100)
  const nextMode = pomo.mode === 'work' ? (pomo.cycles >= pomo.cfg.cycles - 1 ? 'pausa longa' : 'pausa curta') : 'foco'

  const MODES = [['work','Foco'],['short','Pausa curta'],['long','Pausa longa']]
  const SOUNDS = [
    ['silence','Silêncio','Sem som ambiente'],
    ['lofi','Lo-fi','Acorde baixo + textura'],
    ['rain','Chuva','Ruído filtrado contínuo'],
    ['cafe','Café','Ambiente com cliques leves'],
  ]

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="panel-hero">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <span className="eyebrow">Sessao guiada</span>
            <h2 className="text-xl font-semibold mt-2">Estudo juridico com bloco de foco definido.</h2>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Escolha uma tarefa, rode um ciclo e registre progresso real. O foco aqui deve virar historico de estudo, nao apenas cronometro bonito.
            </p>
          </div>
          <div className="hidden sm:grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-white/10 bg-white/5 p-3"><div className="text-lg font-semibold">{completedPct}%</div><div className="text-slate-300">do ciclo</div></div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3"><div className="text-lg font-semibold">{nextMode}</div><div className="text-slate-300">proximo</div></div>
          </div>
        </div>
      </div>
      {/* Timer principal */}
      <div className="card flex flex-col items-center gap-4 py-7">
        {/* Tabs de modo */}
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {MODES.map(([m, l]) => (
            <button key={m} onClick={() => pomo.setMode(m)}
              className={`px-4 h-8 text-xs transition-colors ${pomo.mode === m ? 'bg-brand-800 text-white' : 'bg-white dark:bg-gray-900 text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Anel */}
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 170 170" className="w-44 h-44 -rotate-90">
            <circle cx="85" cy="85" r="76" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-800" />
            <circle cx="85" cy="85" r="76" fill="none" stroke="#534AB7" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-medium tracking-tight">{fmt(pomo.left)}</span>
            <span className="text-xs text-gray-400 mt-1">{pomo.mode === 'work' ? 'FOCO' : pomo.mode === 'short' ? 'PAUSA CURTA' : 'PAUSA LONGA'}</span>
          </div>
        </div>

        {/* Tarefa ativa */}
        <p className="text-sm text-gray-500 text-center max-w-xs min-h-[18px]">
          {activeTask
            ? <span>Foco ativo: <strong className="text-gray-800 dark:text-gray-200">{activeTask.title}</strong></span>
            : <span>Nenhuma tarefa ativa — <button onClick={() => setPanel('tarefas')} className="text-brand-600 underline">selecionar</button></span>
          }
        </p>
        {activeTask?.desc && <p className="text-xs text-gray-400 text-center max-w-md">{activeTask.desc}</p>}

        {/* Controles */}
        <div className="flex items-center gap-3">
          <button onClick={pomo.resetTimer} className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">↺</button>
          <button onClick={toggle} className="w-14 h-14 rounded-full bg-brand-800 hover:bg-brand-900 text-white flex items-center justify-center text-xl transition-colors">
            {pomo.running ? '⏸' : '▶'}
          </button>
          <button onClick={handleEnd} className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">⏭</button>
        </div>

        {/* Ciclos */}
        <div className="flex gap-2">
          {Array.from({ length: pomo.cfg.cycles }, (_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full border-2 ${i < pomo.cycles % pomo.cfg.cycles ? 'bg-brand-600 border-brand-600' : 'border-gray-300 dark:border-gray-600'}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-md text-center">
          <div className="legal-band"><div className="text-lg font-medium">{pomo.cycles}</div><div className="text-[11px] text-gray-500">ciclos totais</div></div>
          <div className="legal-band"><div className="text-lg font-medium">{pomo.doneToday}</div><div className="text-[11px] text-gray-500">hoje</div></div>
          <div className="legal-band"><div className="text-lg font-medium">{pomo.history.length}</div><div className="text-[11px] text-gray-500">historico</div></div>
        </div>
      </div>

      {/* Grid inferior */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sons */}
        <div className="card">
          <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">Sons</h4>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {SOUNDS.map(([s, l, d]) => (
              <button key={s} onClick={() => pomo.setSound(s)}
                className={`py-2 px-2 rounded-lg text-left border transition-colors ${pomo.sound === s ? 'bg-brand-50 border-brand-400 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-300'}`}>
                <span className="block text-xs font-medium">{l}</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">{d}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Vol</span>
            <input type="range" min={0} max={100} step={1} value={pomo.vol} onChange={(e) => pomo.setVol(Number(e.target.value))} className="flex-1" />
            <span className="text-xs text-gray-400 w-6 text-right">{pomo.vol}</span>
          </div>
        </div>

        {/* Meta diária */}
        <div className="card">
          <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">Meta diária</h4>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-500 flex-1">Pomodoros/dia</label>
            <input type="number" min={1} max={20} value={pomo.goal} onChange={(e) => pomo.setGoal(Number(e.target.value))}
              className="w-14 h-7 text-center text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Hoje: <strong className="text-gray-800 dark:text-gray-200">{pomo.doneToday}</strong></span>
            <span className="text-brand-600 font-medium">{Math.min(100, Math.round((pomo.doneToday / pomo.goal) * 100))}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill bg-brand-600" style={{ width: `${Math.min(100, (pomo.doneToday / pomo.goal) * 100)}%` }} /></div>
        </div>

        {/* Configurações */}
        <div className="card">
          <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">Configurações</h4>
          <div className="grid grid-cols-2 gap-2">
            {[['Foco (min)','work'],['Pausa curta','short'],['Pausa longa','long'],['Ciclos','cycles']].map(([label, key]) => (
              <div key={key}>
                <label className="text-[11px] text-gray-400 block mb-1">{label}</label>
                <input type="number" min={1} max={60} value={pomo.cfg[key]}
                  onChange={(e) => pomo.setCfg({ ...pomo.cfg, [key]: Number(e.target.value) })}
                  className="w-full h-8 text-center text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Histórico */}
        <div className="card">
          <h4 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">Histórico de hoje</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {pomo.history.length ? pomo.history.slice(0, 8).map((h, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{h.label}</span>
                <span className="text-gray-400 flex-shrink-0">{h.time}</span>
              </div>
            )) : <p className="text-xs text-gray-400">Nenhuma sessão ainda.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
