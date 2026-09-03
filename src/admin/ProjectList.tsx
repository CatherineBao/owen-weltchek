import { useState } from 'react'
import BlockList from './BlockList'
import ProjectForm from './ProjectForm'
import { deleteProject, updateProject } from './api'
import type { ProjectWithBlocks } from '../types'

interface Props {
  projects: ProjectWithBlocks[]
  onChanged: () => void
}

export default function ProjectList({ projects, onChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = projects.find((p) => p.id === selectedId) ?? null

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
        `Delete "${project.title}" and its ${project.blocks.length} block(s)? ` +
          'Uploaded files will be deleted too. This cannot be undone.',
      )
    ) {
      return
    }
    try {
      await deleteProject(project.id)
      if (selectedId === project.id) setSelectedId(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div>
      <h2>Projects</h2>
      {error && <p role="alert">{error}</p>}

      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <span>
              [{project.sortOrder}] {project.title}
              {project.published ? '' : ' (draft)'} - {project.blocks.length} block(s)
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedId(project.id === selectedId ? null : project.id)
                setEditing(false)
              }}
            >
              {project.id === selectedId ? 'Close' : 'Open'}
            </button>
            <button type="button" onClick={() => void togglePublished(project)}>
              {project.published ? 'Unpublish' : 'Publish'}
            </button>
            <button type="button" onClick={() => void remove(project)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div>
          <h3>{selected.title}</h3>
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
            <button type="button" onClick={() => setEditing(true)}>
              Edit project details
            </button>
          )}

          <BlockList
            projectId={selected.id}
            blocks={selected.blocks}
            onChanged={onChanged}
          />
        </div>
      )}

      <h3>New project</h3>
      <ProjectForm onSaved={onChanged} />
    </div>
  )
}
