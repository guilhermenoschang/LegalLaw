import { useTaskStore, useProjStore, useMetaStore, usePomoStore, useUIStore } from '@/store'

const PROJ_COLORS = { purple: '#534AB7', teal: '#1D9E75', amber: '#EF9F27', coral: '#D85A30' }
const PERIOD_LABEL = { dia: 'Diaria', sem: 'Semanal', mes: 'Mensal' }

function KPI({ value, label, sub }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
      <div className="text-2xl font-medium mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-brand-600 mt-1">{sub}</div>}
    </div>
  )
}

function BarChart({ items, max, color = '#534AB7' }) {
  const m = max || Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24 text-right truncate flex-shrink-0">{item.label}</span>
          <div className="flex-1 h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((item.value / m) * 100)}%`, background: item.color || color }} />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ segments, total, label }) {
  const CIRC = 2 * Math.PI * 40
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
        {segments.filter((s) => s.value > 0).map((s, i) => {
          const dash = total > 0 ? CIRC * (s.value / total) : 0
          const el = (
            <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={s.color} strokeWidth="18"
              strokeDasharray={`${dash.toFixed(1)} ${(CIRC - dash).toFixed(1)}`}
              strokeDashoffset={(-offset).toFixed(1)}
              transform="rotate(-90 50 50)" />
          )
          offset += dash
          return el
        })}
        <text x="50" y="46" textAnchor="middle" fontSize="14" fontWeight="500" fill="currentColor">{total}</text>
        <text x="50" y="58" textAnchor="middle" fontSize="8" fill="#9ca3af">{label}</text>
      </svg>
      <div className="space-y-1.5">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-gray-600 dark:text-gray-400">{s.label}: <strong>{s.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoalRow({ meta, onIncrement }) {
  const pct = meta.target > 0 ? Math.min(100, Math.round((meta.current / meta.target) * 100)) : 0
  const color = pct >= 100 ? 'bg-teal-500' : pct >= 60 ? 'bg-amber-500' : 'bg-brand-600'
  const text = pct >= 100 ? 'Cumprida' : pct >= 60 ? 'Em ritmo' : 'Precisa de acao'

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="chip bg-gray-50 text-gray-500 border-gray-200">{PERIOD_LABEL[meta.period] || meta.period}</span>
            <span className={`text-[11px] font-medium ${pct >= 100 ? 'text-teal-600' : pct >= 60 ? 'text-amber-600' : 'text-brand-600'}`}>{text}</span>
          </div>
          <p className="text-sm font-medium truncate">{meta.title}</p>
          <p className="text-xs text-gray-500 mt-1">{meta.current.toFixed(1)} de {meta.target} {meta.unit}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-medium">{pct}%</div>
          <button onClick={() => onIncrement(meta.id, 1)} className="btn-secondary text-xs mt-2 h-7">+1</button>
        </div>
      </div>
      <div className="progress-bar mt-3">
        <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { tasks }    = useTaskStore()
  const { projects } = useProjStore()
  const { metas, incMeta } = useMetaStore()
  const { setPanel } = useUIStore()
  const pomo         = usePomoStore()

  const done    = tasks.filter((t) => t.status === 'concluida').length
  const inProg  = tasks.filter((t) => t.status === 'andamento').length
  const pending = tasks.filter((t) => t.status === 'pendente').length
  const metasDone = metas.filter((m) => m.current >= m.target).length
  const metasActive = metas.filter((m) => m.current < m.target)
  const metasAtRisk = metasActive.filter((m) => m.target > 0 && (m.current / m.target) < 0.5).length
  const metasFocus = [...metas].sort((a, b) => {
    const ap = a.target > 0 ? a.current / a.target : 0
    const bp = b.target > 0 ? b.current / b.target : 0
    return ap - bp
  }).slice(0, 5)

  // Pomodoros — últimos 7 dias (simulado + hoje real)
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const pomoData = [3, 5, 4, 2, 6, 1, pomo.doneToday]
  const maxPomo  = Math.max(...pomoData, 1)

  const projItems = projects.map((p) => {
    const pt = tasks.filter((t) => t.projId === p.id)
    return { label: p.name, value: pt.length, color: PROJ_COLORS[p.color] }
  })

  const metaItems = [
    { label: 'Diárias', value: metas.filter((m) => m.period === 'dia' && m.current >= m.target).length, color: '#534AB7' },
    { label: 'Semanais', value: metas.filter((m) => m.period === 'sem' && m.current >= m.target).length, color: '#1D9E75' },
    { label: 'Mensais', value: metas.filter((m) => m.period === 'mes' && m.current >= m.target).length, color: '#EF9F27' },
  ]

  return (
    <div className="fade-in space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KPI value={pomo.doneToday} label="Pomodoros hoje" sub={`meta: ${pomo.goal}`} />
        <KPI value={done} label="Tarefas concluídas" sub={`de ${tasks.length} totais`} />
        <KPI value={`${metasDone}/${metas.length}`} label="Metas cumpridas" sub={metasAtRisk ? `${metasAtRisk} pedem atencao` : 'em dia'} />
        <KPI value={projects.length} label="Projetos ativos" />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Metas em destaque</h3>
              <p className="text-xs text-gray-500 mt-1">O Dashboard puxa as metas da aba Metas e mostra o que exige execucao agora.</p>
            </div>
            <button onClick={() => setPanel('metas')} className="btn-secondary text-xs">Abrir metas</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {metasFocus.length ? metasFocus.map((meta) => (
              <GoalRow key={meta.id} meta={meta} onIncrement={incMeta} />
            )) : <p className="text-sm text-gray-400">Nenhuma meta cadastrada.</p>}
          </div>
        </div>

        <div className="panel-hero">
          <span className="eyebrow">Prioridade da semana</span>
          <h2 className="text-xl font-semibold mt-2">{metasAtRisk ? `${metasAtRisk} meta(s) precisam de tracao` : 'Metas em bom ritmo'}</h2>
          <p className="text-sm text-slate-300 mt-2">
            Use metas como comando de agenda: se uma meta nao aparece no Dashboard, ela tende a virar promessa solta.
          </p>
          <button onClick={() => setPanel('metas')} className="mt-4 h-8 px-3 rounded-md bg-white text-slate-950 text-sm font-medium">Ajustar metas</button>
        </div>
      </div>

      {/* Gráficos linha 1 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Pomodoros — últimos 7 dias</h3>
          <div className="flex items-end gap-1.5 h-16">
            {pomoData.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${Math.round((v / maxPomo) * 52) + 4}px`, background: i === 6 ? '#534AB7' : '#AFA9EC' }} />
                <span className="text-[10px] text-gray-400">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Tarefas por projeto</h3>
          {projItems.length ? <BarChart items={projItems} /> : <p className="text-xs text-gray-400">Nenhum projeto ainda.</p>}
        </div>
      </div>

      {/* Gráficos linha 2 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Status das tarefas</h3>
          <DonutChart
            total={tasks.length}
            label="tarefas"
            segments={[
              { label: 'Concluídas', value: done, color: '#1D9E75' },
              { label: 'Em andamento', value: inProg, color: '#EF9F27' },
              { label: 'Pendentes', value: pending, color: '#534AB7' },
            ]}
          />
        </div>

        <div className="card">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Metas cumpridas</h3>
          <BarChart items={metaItems} max={Math.max(...metaItems.map((i) => metas.filter((m) => m.period === (['dia','sem','mes'][metaItems.indexOf(i)])).length), 1)} />
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total de metas</span><strong>{metas.length}</strong>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Concluídas</span><strong className="text-teal-600">{metasDone}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Progresso dos projetos */}
      {projects.length > 0 && (
        <div className="card">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Progresso dos projetos</h3>
          <div className="space-y-4">
            {projects.map((p) => {
              const pt = tasks.filter((t) => t.projId === p.id)
              const pc = pt.length ? Math.round((pt.filter((t) => t.status === 'concluida').length / pt.length) * 100) : 0
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: PROJ_COLORS[p.color] }} />
                      {p.name}
                    </span>
                    <span className="text-gray-500">{pc}%</span>
                  </div>
                  <div className="progress-bar h-2">
                    <div className="progress-fill" style={{ width: `${pc}%`, background: PROJ_COLORS[p.color] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
