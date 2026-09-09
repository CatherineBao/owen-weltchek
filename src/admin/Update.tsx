import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import AdminLogin from './AdminLogin'
import ProjectList from './ProjectList'
import SettingsForm from './SettingsForm'
import { listProjects, logout } from './api'
import { useSession } from './useSession'
import { alert, button } from './ui'
import { ApiError } from '../http'
import type { ProjectWithBlocks } from '../types'

// One column, held to a readable measure and centred, with the same gutter at
// every width. Everything below inherits this margin rather than setting its
// own.
// Each caller sets its own measure — stacking two max-w utilities in one
// class string leaves the winner to stylesheet order, not to the order here.
const page = 'mx-auto w-full px-6 py-12'

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
      <main className={`${page} max-w-sm`}>
        <h1 className="mb-6 text-xl font-semibold">Update</h1>
        <AdminLogin onSuccess={() => void refresh()} />
        <Link to="/" className={`${button} mt-6 inline-block`}>
          Back to site
        </Link>
      </main>
    )
  }

  return (
    <main className={`${page} max-w-3xl`}>
      <header className="mb-10 flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-semibold">Update</h1>
        <div className="flex items-center gap-2">
          <Link to="/" className={button}>
            Back to site
          </Link>
          <button
            type="button"
            className={button}
            onClick={async () => {
              await logout()
              setStatus('anonymous')
            }}
          >
            Log out
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className={`mb-6 ${alert}`}>
          {error}
        </p>
      )}

      <div className="grid gap-12">
        <SettingsForm />
        <ProjectList projects={projects} onChanged={() => void reload()} />
      </div>
    </main>
  )
}
