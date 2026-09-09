import { useState } from 'react'
import { login } from './api'
import { alert, button, field, input, label, stack } from './ui'

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(password)
      setPassword('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={stack}>
      <div className={field}>
        <label htmlFor="password" className={label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <button type="submit" className={button} disabled={busy || password === ''}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
      {error && (
        <p role="alert" className={alert}>
          {error}
        </p>
      )}
    </form>
  )
}
