import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from './api'
import { alert, buttonSave, field, input, label, sectionHeading, stack, textarea } from './ui'
import type { Settings } from '../types'

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null)
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

  if (!settings) return <p className="text-sm">{error ?? 'Loading settings...'}</p>

  const set = (key: keyof Settings) => (value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // The guard above already returned, but `submit` is hoisted, so TypeScript
    // can't see that this only runs once the settings have loaded.
    if (!settings) return
    setBusy(true)
    setError(null)
    setStatus(null)

    try {
      const { settings: saved } = await saveSettings(settings)
      setSettings(saved)
      setStatus('Saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2 className={`${sectionHeading} mb-4`}>Site details</h2>

      <form onSubmit={submit} className={stack}>
        <div className={field}>
          <label htmlFor="site_title" className={label}>
            Site title
          </label>
          <input
            id="site_title"
            className={input}
            value={settings.site_title ?? ''}
            onChange={(e) => set('site_title')(e.target.value)}
          />
        </div>

        <div className={field}>
          <label htmlFor="site_tagline" className={label}>
            Tagline
          </label>
          <input
            id="site_tagline"
            className={input}
            value={settings.site_tagline ?? ''}
            onChange={(e) => set('site_tagline')(e.target.value)}
            placeholder="Mechanical Engineering • Robotics • Art"
          />
        </div>

        <div className={field}>
          <label htmlFor="site_school" className={label}>
            School
          </label>
          <input
            id="site_school"
            className={input}
            value={settings.site_school ?? ''}
            onChange={(e) => set('site_school')(e.target.value)}
            placeholder="Carnegie Mellon University"
          />
        </div>

        <div className={field}>
          <label htmlFor="site_degree" className={label}>
            Degree
          </label>
          <input
            id="site_degree"
            className={input}
            value={settings.site_degree ?? ''}
            onChange={(e) => set('site_degree')(e.target.value)}
            placeholder="Bachelor of Engineering Studies and Art"
          />
        </div>

        <div className={field}>
          <label htmlFor="about_body" className={label}>
            About
          </label>
          <textarea
            id="about_body"
            className={textarea}
            value={settings.about_body ?? ''}
            onChange={(e) => set('about_body')(e.target.value)}
          />
        </div>

        <div className={field}>
          <label htmlFor="contact_email" className={label}>
            Contact email
          </label>
          <input
            id="contact_email"
            type="email"
            className={input}
            value={settings.contact_email ?? ''}
            onChange={(e) => set('contact_email')(e.target.value)}
          />
        </div>

        <div className={field}>
          <label htmlFor="contact_phone" className={label}>
            Contact phone
          </label>
          <input
            id="contact_phone"
            type="tel"
            className={input}
            value={settings.contact_phone ?? ''}
            onChange={(e) => set('contact_phone')(e.target.value)}
          />
        </div>

        <div className={field}>
          <label htmlFor="linkedin_url" className={label}>
            LinkedIn URL
          </label>
          <input
            id="linkedin_url"
            type="url"
            className={input}
            value={settings.linkedin_url ?? ''}
            onChange={(e) => set('linkedin_url')(e.target.value)}
          />
        </div>

        <div className={field}>
          <label htmlFor="portfolio_url" className={label}>
            Portfolio URL
          </label>
          <input
            id="portfolio_url"
            type="url"
            className={input}
            value={settings.portfolio_url ?? ''}
            onChange={(e) => set('portfolio_url')(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className={buttonSave} disabled={busy}>
            {busy ? 'Saving...' : 'Save site details'}
          </button>
          {status && <span className="text-sm">{status}</span>}
        </div>
        {error && (
          <p role="alert" className={alert}>
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
