import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from './api'
import { uploadFile } from './upload'
import type { Settings } from '../types'

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSettings()
      .then(({ settings }) => setSettings(settings))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load settings'),
      )
  }, [])

  if (!settings) return <p>{error ?? 'Loading settings...'}</p>

  const set = (key: keyof Settings) => (value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setStatus(null)

    try {
      let next: Settings = { ...settings }

      if (resumeFile) {
        setProgress(0)
        const uploaded = await uploadFile(resumeFile, setProgress)
        // The server deletes the previous resume once this new URL lands.
        next = {
          ...next,
          resume_url: uploaded.url,
          resume_file_name: uploaded.fileName,
        }
      }

      const { settings: saved } = await saveSettings(next)
      setSettings(saved)
      setResumeFile(null)
      setStatus('Saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Site details</h2>

      <label htmlFor="site_title">Site title</label>
      <input
        id="site_title"
        value={settings.site_title ?? ''}
        onChange={(e) => set('site_title')(e.target.value)}
      />

      <label htmlFor="site_tagline">Tagline</label>
      <input
        id="site_tagline"
        value={settings.site_tagline ?? ''}
        onChange={(e) => set('site_tagline')(e.target.value)}
      />

      <label htmlFor="about_body">About</label>
      <textarea
        id="about_body"
        value={settings.about_body ?? ''}
        onChange={(e) => set('about_body')(e.target.value)}
      />

      <label htmlFor="contact_email">Contact email</label>
      <input
        id="contact_email"
        type="email"
        value={settings.contact_email ?? ''}
        onChange={(e) => set('contact_email')(e.target.value)}
      />

      <label htmlFor="resume">Resume (PDF)</label>
      <input
        id="resume"
        type="file"
        accept="application/pdf"
        onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
      />
      {settings.resume_url && (
        <p>
          Current:{' '}
          <a href={settings.resume_url} target="_blank" rel="noreferrer">
            {settings.resume_file_name || 'resume.pdf'}
          </a>
        </p>
      )}
      {progress !== null && <p>Uploading: {Math.round(progress)}%</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Saving...' : 'Save site details'}
      </button>
      {status && <p>{status}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
