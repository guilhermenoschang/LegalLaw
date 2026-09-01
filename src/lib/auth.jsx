import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [localMode, setLocalMode] = useState(!isFirebaseConfigured)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return undefined
    }

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) setLocalMode(false)
    })
  }, [])

  const value = useMemo(() => ({
    user,
    localMode,
    loading,
    isFirebaseConfigured,
    async loginWithGoogle() {
      if (!auth || !googleProvider) throw new Error('Firebase nao configurado.')
      await signInWithPopup(auth, googleProvider)
    },
    async logout() {
      if (auth) await signOut(auth)
      setUser(null)
      setLocalMode(true)
    },
    showLogin() {
      setLocalMode(false)
    },
    continueLocal() {
      setLocalMode(true)
    },
  }), [user, localMode, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return ctx
}
