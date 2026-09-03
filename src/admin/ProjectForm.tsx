import { useState } from 'react'
import { createProject, updateProject } from './api'
import { button, buttonSave, field, input, label, stack, textarea } from './ui'
import { formatDateRange } from '../dates'
import type { Project } from '../types'

interface Props {
  /** Present when editing; absent when creating. */
  project?: Project
  onSaved: () => void
  onCancel?: () => void
}

export default function ProjectForm({ project, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  // <input type="month"> speaks "YYYY-MM", the same shape the column stores.
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [endDate, setEndDate] = useState(project?.endDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Two forms can be on screen at once (editing one project while creating
  // another), so the ids have to be scoped or the labels point at the wrong
  // control.
  const uid = project ? `project-${project.id}` : 'project-new'

  /**
   * `publish` is only meaningful on create, where the two buttons are the
   * choice. An edit leaves the field out of the payload entirely, so saving a
   * published project never quietly unpublishes it — that switch lives on the
   * row in the list, next to the rest of the project's state.
   */
  async function save(publish: boolean) {
    setBusy(true)
    setError(null)
    // No sortOrder: ordering is drag-and-drop in the list, and a new project
    // is appended by the server.
    const payload = { title, description, startDate, endDate }
    try {
      if (project) {
        await updateProject(project.id, payload)
      } else {
        await createProject({ ...payload, published: publish })
        setTitle('')
        setDescription('')
        setStartDate('')
        setEndDate('')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    // The form's own submit is the primary action: Enter in a text field
    // publishes a new project, or saves an existing one.
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save(true)
      }}
      className={stack}
    >
      <div className={field}>
        <label htmlFor={`${uid}-title`} className={label}>
          Title
        </label>
        <input
          id={`${uid}-title`}
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className={field}>
        <label htmlFor={`${uid}-description`} className={label}>
          Description
        </label>
        <textarea
          id={`${uid}-description`}
          className={`${textarea} min-h-48`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={'Project description'}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={field}>
          <label htmlFor={`${uid}-start`} className={label}>
            Start
          </label>
          <input
            id={`${uid}-start`}
            type="month"
            className={input}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className={field}>
          <label htmlFor={`${uid}-end`} className={label}>
            End
          </label>
          <input
            id={`${uid}-end`}
            type="month"
            className={input}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <p className="text-sm text-neutral-600">
        {`Shows as: ${formatDateRange(startDate, endDate) ?? 'nothing yet'}. `}
        Leave End blank while the project is ongoing.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={buttonSave}
          disabled={busy || title.trim() === ''}
        >
          {busy ? 'Saving...' : project ? 'Save project' : 'Publish'}
        </button>
        {/* Create only: an existing project's published state is changed from
            its row in the list, so there is nothing for a second button here to
            do that Save doesn't already. */}
        {!project && (
          <button
            type="button"
            className={button}
            onClick={() => void save(false)}
            disabled={busy || title.trim() === ''}
          >
            Save as draft
          </button>
        )}
        {onCancel && (
          <button type="button" className={button} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
      {!project && (
        <p className="text-sm text-neutral-600">
          Publish puts it on the site straight away. A draft stays here until you
          publish it from the list.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </form>
  )
}
