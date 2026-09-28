import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth'
import { getAppStateSnapshot, hydrateAppState, subscribeToAppState } from '@/store'

export default function CloudSync() {
  const { user, localMode } = useAuth()
  const [status, setStatus] = useState('idle')
  const hydratedUser = useRef(null)

  useEffect(() => {
    if (!db || !user || localMode) return undefined

    let cancelled = false
    let saveTimer = null
    const stateRef = doc(db, 'users', user.uid, 'appState', 'main')

    async function start() {
      setStatus('syncing')
      const snap = await getDoc(stateRef)
      if (!cancelled && snap.exists() && hydratedUser.current !== user.uid) {
        hydrateAppState(snap.data())
        hydratedUser.current = user.uid
      }
      if (!cancelled) setStatus('synced')
    }

    start().catch(() => {
      if (!cancelled) setStatus('error')
    })

    const unsubscribe = subscribeToAppState(() => {
      if (cancelled) return
      window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(async () => {
        try {
          setStatus('syncing')
          await setDoc(stateRef, {
            ...getAppStateSnapshot(),
            updatedAt: serverTimestamp(),
          }, { merge: true })
          if (!cancelled) setStatus('synced')
        } catch {
          if (!cancelled) setStatus('error')
        }
      }, 800)
    })

    return () => {
      cancelled = true
      window.clearTimeout(saveTimer)
      unsubscribe()
    }
  }, [user, localMode])

  if (!user || localMode) return null

  return (
    <div className="fixed bottom-3 left-3 z-40 rounded-full border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 px-3 py-1 text-[11px] text-gray-500 shadow-sm">
      {status === 'syncing' ? 'Sincronizando...' : status === 'error' ? 'Sync pendente' : 'Dados sincronizados'}
    </div>
  )
}
