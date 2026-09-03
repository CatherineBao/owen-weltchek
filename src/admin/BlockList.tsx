import { useState } from 'react'
import BlockForm from './BlockForm'
import { deleteBlock } from './api'
import type { Block } from '../types'

interface Props {
  projectId: string
  blocks: Block[]
  onChanged: () => void
}

export default function BlockList({ projectId, blocks, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(block: Block) {
    if (!confirm(`Delete this ${block.kind} block?`)) return
    try {
      await deleteBlock(block.id)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div>
      <h3>Blocks</h3>
      {error && <p role="alert">{error}</p>}

      <ul>
        {blocks.map((block) =>
          editingId === block.id ? (
            <li key={block.id}>
              <BlockForm
                projectId={projectId}
                block={block}
                onSaved={() => {
                  setEditingId(null)
                  onChanged()
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={block.id}>
              <span>
                [{block.sortOrder}] {block.kind}
                {block.heading ? ` - ${block.heading}` : ''}
                {block.body ? ` - ${block.body.slice(0, 60)}` : ''}
                {block.fileName ? ` - ${block.fileName}` : ''}
              </span>
              <button type="button" onClick={() => setEditingId(block.id)}>
                Edit
              </button>
              <button type="button" onClick={() => void remove(block)}>
                Delete
              </button>
            </li>
          ),
        )}
      </ul>

      <h4>Add a block</h4>
      <BlockForm projectId={projectId} onSaved={onChanged} />
    </div>
  )
}
