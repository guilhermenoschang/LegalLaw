import { useEffect } from 'react'
import { useUIStore } from '@/store'
import Layout from '@/components/layout/Layout'
import { AuthProvider } from '@/lib/auth'
import AuthGate from '@/components/auth/AuthGate'
import CloudSync from '@/components/sync/CloudSync'

export default function App() {
  const darkMode = useUIStore((s) => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <AuthProvider>
      <AuthGate>
        <CloudSync />
        <Layout />
      </AuthGate>
    </AuthProvider>
  )
}
