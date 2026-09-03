import { useCallback, useEffect, useState } from 'react'
import { getSession } from './api'

type Status = 'checking' | 'authed' | 'anonymous'

/**
 * The session cookie is HttpOnly, so the page can't read it — it asks the
 * server on mount instead.
 */
export function useSession() {
  const [status, setStatus] = useState<Status>('checking')

  const refresh = useCallback(async () => {
    try {
      const { authed } = await getSession()
      setStatus(authed ? 'authed' : 'anonymous')
    } catch {
      setStatus('anonymous')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { status, refresh, setStatus }
}
