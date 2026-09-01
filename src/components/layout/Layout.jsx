import { lazy, Suspense } from 'react'
import Sidebar from './Sidebar'
import { useUIStore } from '@/store'
import ChatBubble from '@/components/chat/ChatBubble'
import { useAuth } from '@/lib/auth'

const PANELS = {
  agenda:       lazy(() => import('@/components/agenda/Agenda')),
  tarefas:      lazy(() => import('@/components/tarefas/Tarefas')),
  foco:         lazy(() => import('@/components/foco/Foco')),
  projetos:     lazy(() => import('@/components/projetos/Projetos')),
  metas:        lazy(() => import('@/components/metas/Metas')),
  estudos:      lazy(() => import('@/components/estudos/Estudos')),
  constituicao: lazy(() => import('@/components/constituicao/Constituicao')),
  pena:         lazy(() => import('@/components/pena/Pena')),
  quiz:         lazy(() => import('@/components/quiz/Quiz')),
  dashboard:    lazy(() => import('@/components/dashboard/Dashboard')),
  config:       lazy(() => import('@/components/config/Config')),
}

const TITLES = {
  agenda: 'Agenda', tarefas: 'Tarefas', foco: 'Foco — Pomodoro',
  projetos: 'Projetos', metas: 'Metas', estudos: 'Estudos',
  constituicao: 'Constituição Federal', pena: 'Calculadora de Pena',
  quiz: 'Quiz IA', dashboard: 'Dashboard', config: 'Configurações',
}

export default function Layout() {
  const { currentPanel, darkMode, toggleDarkMode } = useUIStore()
  const { user, localMode, logout, showLogin } = useAuth()
  const Panel = PANELS[currentPanel] || PANELS.dashboard

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-[52px] flex items-center px-5 gap-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h1 className="text-[15px] font-medium flex-1 text-gray-900 dark:text-gray-100">
            {TITLES[currentPanel]}
          </h1>
          <span className="hidden sm:inline-flex text-[11px] text-gray-500 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1">
            {user ? `Cloud: ${user.email}` : localMode ? 'Modo local' : 'Sem sessao'}
          </span>
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 text-sm"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {(user || localMode) && (
            <button onClick={user ? logout : showLogin} className="btn-secondary text-xs">
              {user ? 'Sair' : 'Login'}
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 relative">
          <Suspense fallback={
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              Carregando...
            </div>
          }>
            <Panel />
          </Suspense>
          <ChatBubble />
        </main>
      </div>
    </div>
  )
}
