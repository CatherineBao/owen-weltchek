import { useCallback, useEffect, useState } from 'react'
import AdminLogin from './AdminLogin'
import ProjectList from './ProjectList'
import SettingsForm from './SettingsForm'
import { listProjects, logout } from './api'
import { useSession } from './useSession'
import { ApiError } from '../http'
import type { ProjectWithBlocks } from '../types'

export default function Update() {
  const { status, refresh, setStatus } = useSession()
  const [projects, setProjects] = useState<ProjectWithBlocks[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const { projects } = await listProjects()
      setProjects(projects)
      setError(null)
    } catch (e) {
      // A session that expired mid-edit should return to the login form
      // rather than showing a bare error.
      if (e instanceof ApiError && e.isUnauthorized) {
        setStatus('anonymous')
        return
      }
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    }
  }, [setStatus])

  useEffect(() => {
    if (status === 'authed') void reload()
  }, [status, reload])

  if (status === 'checking') return null

  if (status === 'anonymous') {
    return (
      <main>
        <h1>Update</h1>
        <AdminLogin onSuccess={() => void refresh()} />
      </main>
    )
  }

  return (
    <main>
      <h1>Update</h1>
      <button
        type="button"
        onClick={async () => {
          await logout()
          setStatus('anonymous')
        }}
      >
        Log out
      </button>

      {error && <p role="alert">{error}</p>}

      <SettingsForm />
      <ProjectList projects={projects} onChanged={() => void reload()} />
    </main>
  )
}
