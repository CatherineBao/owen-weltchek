import { useState } from 'react'
import { createProject, updateProject } from './api'
import type { Project } from '../types'

interface Props {
  /** Present when editing; absent when creating. */
  project?: Project
  onSaved: () => void
  onCancel?: () => void
}

export default function ProjectForm({ project, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [subtitle, setSubtitle] = useState(project?.subtitle ?? '')
  const [year, setYear] = useState(project?.year ?? '')
  // Gaps of 10 leave room to insert between projects without renumbering.
  const [sortOrder, setSortOrder] = useState(project?.sortOrder ?? 0)
  const [published, setPublished] = useState(project?.published ?? false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const payload = { title, subtitle, year, sortOrder, published }
    try {
      if (project) {
        await updateProject(project.id, payload)
      } else {
        await createProject(payload)
        setTitle('')
        setSubtitle('')
        setYear('')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="title">Title</label>
      <input
        id="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <label htmlFor="subtitle">Subtitle</label>
      <input
        id="subtitle"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
      />

      <label htmlFor="year">Year</label>
      <input
        id="year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder="2025, or ongoing"
      />

      <label htmlFor="projectSortOrder">Order</label>
      <input
        id="projectSortOrder"
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(Number(e.target.value))}
      />

      <label htmlFor="published">
        <input
          id="published"
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published
      </label>

      <button type="submit" disabled={busy || title.trim() === ''}>
        {busy ? 'Saving...' : project ? 'Save project' : 'Create project'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
