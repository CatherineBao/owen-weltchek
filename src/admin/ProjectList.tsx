import { useMemo, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import BlockList from './BlockList'
import ProjectForm from './ProjectForm'
import { deleteProject, reorderProjects, updateProject } from './api'
import { alert, button, buttonDanger, sectionHeading } from './ui'
import type { ProjectWithBlocks } from '../types'

interface Props {
  projects: ProjectWithBlocks[]
  onChanged: () => void
}

export default function ProjectList({ projects, onChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The order the user has dragged into, held until the server round-trip
  // brings the same order back. Ids, not rows: the rows themselves keep coming
  // from props, so a publish toggle elsewhere isn't masked by a stale copy.
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)

  const ordered = useMemo(() => {
    if (!pendingIds) return projects
    const byId = new Map(projects.map((p) => [p.id, p]))
    const rows = pendingIds.map((id) => byId.get(id)).filter((p) => p !== undefined)
    // A project created or deleted since the drag makes the pending order
    // stale; the server's answer is the honest one.
    return rows.length === projects.length ? rows : projects
  }, [projects, pendingIds])

  const ids = useMemo(() => ordered.map((p) => p.id), [ordered])

  const selected = ordered.find((p) => p.id === selectedId) ?? null

  async function persistOrder(next: string[]) {
    try {
      await reorderProjects(next)
      onChanged()
    } catch (err) {
      // Drop the optimistic order so the list snaps back to what's stored,
      // rather than showing an order the database doesn't have.
      setPendingIds(null)
      setError(err instanceof Error ? err.message : 'Reorder failed')
    }
  }

  /** Keyboard equivalent of a drag: the handle responds to up/down arrows. */
  function move(id: string, delta: number) {
    const from = ids.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= ids.length) return
    const next = [...ids]
    next.splice(to, 0, ...next.splice(from, 1))
    setPendingIds(next)
    void persistOrder(next)
  }

  async function togglePublished(project: ProjectWithBlocks) {
    try {
      await updateProject(project.id, { published: !project.published })
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function remove(project: ProjectWithBlocks) {
    if (
      !confirm(
        `Delete "${project.title}" and its ${project.blocks.length} supporting ` +
          `document(s)? ` +
          'Uploaded files will be deleted too. This cannot be undone.',
      )
    ) {
      return
    }
    try {
      await deleteProject(project.id)
      if (selectedId === project.id) setSelectedId(null)
      setPendingIds(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <section className="grid gap-8">
      <div>
        <h2 className={`${sectionHeading} mb-4`}>Projects</h2>
        {error && (
          <p role="alert" className={`mb-4 ${alert}`}>
            {error}
          </p>
        )}

        {projects.length === 0 ? (
          <p className="text-sm">No projects yet.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-neutral-600">
              Drag a row by its handle to reorder. This is the order they appear on
              the site.
            </p>
            {/* Values are ids rather than rows so that a re-fetch, which hands
                back new objects for the same projects, doesn't read as a
                reorder. */}
            <Reorder.Group
              as="ul"
              axis="y"
              values={ids}
              onReorder={setPendingIds}
              className="divide-y divide-neutral-200 border-y border-neutral-200"
            >
              {ordered.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  isOpen={project.id === selectedId}
                  isFirst={project.id === ids[0]}
                  isLast={project.id === ids[ids.length - 1]}
                  onDrop={() => void persistOrder(ids)}
                  onMove={(delta) => move(project.id, delta)}
                  onToggleOpen={() => {
                    setSelectedId(project.id === selectedId ? null : project.id)
                    setEditing(false)
                  }}
                  onTogglePublished={() => void togglePublished(project)}
                  onDelete={() => void remove(project)}
                />
              ))}
            </Reorder.Group>
          </>
        )}
      </div>

      {selected && (
        // The open project is indented behind a rule, so it reads as belonging
        // to the row above rather than as another top-level section.
        <div className="grid gap-6 border-l border-neutral-200 pl-6">
          <h3 className="font-semibold">{selected.title}</h3>
          {editing ? (
            <ProjectForm
              project={selected}
              onSaved={() => {
                setEditing(false)
                onChanged()
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div>
              <button type="button" className={button} onClick={() => setEditing(true)}>
                Edit project details
              </button>
            </div>
          )}

          <BlockList
            projectId={selected.id}
            blocks={selected.blocks}
            onChanged={onChanged}
          />
        </div>
      )}

      <div className="border-t border-neutral-200 pt-8">
        <h3 className="mb-4 font-semibold">New project</h3>
        <ProjectForm
          onSaved={() => {
            setPendingIds(null)
            onChanged()
          }}
        />
      </div>
    </section>
  )
}

interface RowProps {
  project: ProjectWithBlocks
  isOpen: boolean
  isFirst: boolean
  isLast: boolean
  onDrop: () => void
  onMove: (delta: number) => void
  onToggleOpen: () => void
  onTogglePublished: () => void
  onDelete: () => void
}

/**
 * Its own component because useDragControls is a hook: the controls have to be
 * created per row, and that can't happen inside a .map().
 */
function ProjectRow({
  project,
  isOpen,
  isFirst,
  isLast,
  onDrop,
  onMove,
  onToggleOpen,
  onTogglePublished,
  onDelete,
}: RowProps) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      as="li"
      value={project.id}
      // Only the handle starts a drag. Without this the whole row is draggable
      // and a click that strays a pixel turns into a reorder instead of a
      // button press.
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="flex flex-wrap items-center justify-between gap-3 bg-white py-3"
    >
      <span className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={`Reorder ${project.title}. Use the up and down arrow keys.`}
          className="cursor-grab select-none px-1 text-neutral-400 active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            // Otherwise the arrow scrolls the page out from under the row.
            e.preventDefault()
            onMove(e.key === 'ArrowUp' ? -1 : 1)
          }}
          disabled={isFirst && isLast}
        >
          ⠿
        </button>
        <span className="truncate text-sm">
          {project.title}
          {project.published ? '' : ' (draft)'} - {project.blocks.length} document(s)
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={onToggleOpen}>
          {isOpen ? 'Close' : 'Update'}
        </button>
        <button type="button" className={button} onClick={onTogglePublished}>
          {project.published ? 'Unpublish' : 'Publish'}
        </button>
        <button type="button" className={buttonDanger} onClick={onDelete}>
          Delete
        </button>
      </span>
    </Reorder.Item>
  )
}
