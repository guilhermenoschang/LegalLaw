import { useUIStore } from '@/store'

const NAV = [
  { section: 'Produtividade' },
  { id: 'agenda',      label: 'Agenda',          icon: '📅' },
  { id: 'tarefas',     label: 'Tarefas',          icon: '✅' },
  { id: 'foco',        label: 'Foco',             icon: '⏱' },
  { id: 'projetos',    label: 'Projetos',         icon: '📁' },
  { id: 'metas',       label: 'Metas',            icon: '🎯' },
  { id: 'estudos',     label: 'Estudos',          icon: '📚' },
  { section: 'Jurídico' },
  { id: 'constituicao',label: 'Constituição',     icon: '⚖️' },
  { id: 'pena',        label: 'Calc. de Pena',   icon: '📊' },
  { id: 'quiz',        label: 'Quiz IA',          icon: '🤖' },
  { section: 'Visão Geral' },
  { id: 'dashboard',   label: 'Dashboard',        icon: '📈' },
  { id: 'config',      label: 'Configurações',    icon: '⚙️' },
]

export default function Sidebar() {
  const { currentPanel, setPanel, sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={`
        flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        flex-shrink-0 transition-all duration-200 overflow-hidden
        ${sidebarCollapsed ? 'w-14' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className="h-13 flex items-center gap-2.5 px-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0" style={{height:'52px'}}>
        <div className="w-7 h-7 min-w-7 rounded-md bg-brand-800 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
          LF
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
            Legal Flow <span className="font-normal text-gray-400">OS</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
        {NAV.map((item, i) => {
          if (item.section) {
            return !sidebarCollapsed ? (
              <p key={i} className="text-[10px] font-medium uppercase tracking-widest text-gray-400 px-2 pt-3 pb-1">
                {item.section}
              </p>
            ) : <div key={i} className="h-3" />
          }
          return (
            <button
              key={item.id}
              onClick={() => setPanel(item.id)}
              className={`sidebar-item w-full text-left ${currentPanel === item.id ? 'active' : ''}`}
            >
              <span className="text-base w-7 flex items-center justify-center flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-200 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
      >
        <span
          className="w-7 flex items-center justify-center text-sm transition-transform duration-200 flex-shrink-0"
          style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ◀
        </span>
        {!sidebarCollapsed && <span>Recolher</span>}
      </button>
    </aside>
  )
}
