import { useState } from 'react'
import { useAuth } from '@/lib/auth'

export default function AuthGate({ children }) {
  const { user, localMode, loading, isFirebaseConfigured, loginWithGoogle, continueLocal } = useAuth()
  const [error, setError] = useState('')

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-500 text-sm">
        Carregando acesso...
      </div>
    )
  }

  if (user || localMode) {
    return children
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 grid place-items-center p-6">
      <div className="w-full max-w-sm card space-y-5">
        <div>
          <div className="w-10 h-10 rounded-lg bg-brand-800 text-white grid place-items-center text-sm font-medium mb-3">
            LF
          </div>
          <h1 className="text-lg font-semibold">Legal Flow OS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Entre para sincronizar seus dados por usuario. Voce tambem pode testar em modo local.
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3">
            Firebase ainda nao esta configurado. O app vai funcionar em modo local ate as variaveis de ambiente serem preenchidas.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs p-3">
            {error}
          </div>
        )}

        <button
          className="btn-primary w-full justify-center h-10"
          disabled={!isFirebaseConfigured}
          onClick={async () => {
            setError('')
            try {
              await loginWithGoogle()
            } catch (err) {
              setError(err.message || 'Nao foi possivel entrar com Google.')
            }
          }}
        >
          Entrar com Google
        </button>
        <button className="btn-secondary w-full justify-center h-10" onClick={continueLocal}>
          Continuar em modo local
        </button>
      </div>
    </div>
  )
}
