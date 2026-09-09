import { useMemo, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import BlockForm from './BlockForm'
import { deleteBlock, reorderBlocks } from './api'
import { alert, button, buttonDanger } from './ui'
import { type Block, carouselImages } from '../types'

interface Props {
  projectId: string
  blocks: Block[]
  onChanged: () => void
}

export default function BlockList({ projectId, blocks, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The order the user has dragged into, held until the server round-trip
  // brings the same order back. Ids, not rows: the rows keep coming from
  // props, so an edit elsewhere isn't masked by a stale copy.
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)

  const ordered = useMemo(() => {
    if (!pendingIds) return blocks
    const byId = new Map(blocks.map((b) => [b.id, b]))
    const rows = pendingIds.map((id) => byId.get(id)).filter((b) => b !== undefined)
    // One added or deleted since the drag makes the pending order stale; the
    // server's answer is the honest one.
    return rows.length === blocks.length ? rows : blocks
  }, [blocks, pendingIds])

  const ids = useMemo(() => ordered.map((b) => b.id), [ordered])

  async function persistOrder(next: string[]) {
    try {
      await reorderBlocks(projectId, next)
      onChanged()
    } catch (err) {
      // Drop the optimistic order so the list snaps back to what's stored.
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

  async function remove(block: Block) {
    if (!confirm(`Delete this ${block.kind}?`)) return
    try {
      await deleteBlock(block.id)
      setPendingIds(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h3 className="mb-4 font-semibold">Supporting documents</h3>
        {error && (
          <p role="alert" className={`mb-4 ${alert}`}>
            {error}
          </p>
        )}

        {blocks.length === 0 ? (
          <p className="text-sm">No supporting documents yet.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-neutral-600">
              Drag by the handle to reorder. This is the order they appear inside
              the project.
            </p>
            {/* Values are ids rather than rows so that a re-fetch, which hands
                back new objects for the same documents, doesn't read as a
                reorder. */}
            <Reorder.Group
              as="ul"
              axis="y"
              values={ids}
              onReorder={setPendingIds}
              className="divide-y divide-neutral-200 border-y border-neutral-200"
            >
              {ordered.map((block) =>
                editingId === block.id ? (
                  // Not a Reorder.Item while it's an open form: a drag handle
                  // on a form the user is typing into is a trap, not a feature.
                  <li key={block.id} className="py-4">
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
                  <BlockRow
                    key={block.id}
                    block={block}
                    isOnly={ids.length === 1}
                    onDrop={() => void persistOrder(ids)}
                    onMove={(delta) => move(block.id, delta)}
                    onEdit={() => setEditingId(block.id)}
                    onDelete={() => void remove(block)}
                  />
                ),
              )}
            </Reorder.Group>
          </>
        )}
      </div>

      <div>
        <h4 className="mb-4 text-sm font-semibold">Add a supporting document</h4>
        <BlockForm
          projectId={projectId}
          onSaved={() => {
            setPendingIds(null)
            onChanged()
          }}
        />
      </div>
    </div>
  )
}

interface RowProps {
  block: Block
  isOnly: boolean
  onDrop: () => void
  onMove: (delta: number) => void
  onEdit: () => void
  onDelete: () => void
}

/**
 * Its own component because useDragControls is a hook: the controls have to be
 * created per row, and that can't happen inside a .map().
 */
function BlockRow({ block, isOnly, onDrop, onMove, onEdit, onDelete }: RowProps) {
  const controls = useDragControls()

  const slides = carouselImages(block)

  const label = [
    block.kind,
    block.heading,
    block.body?.slice(0, 60),
    // A carousel has no fileName of its own; its size is the useful thing to
    // see without opening it.
    block.kind === 'carousel'
      ? `${slides.length} image${slides.length === 1 ? '' : 's'}`
      : block.fileName,
  ]
    .filter(Boolean)
    .join(' - ')

  return (
    <Reorder.Item
      as="li"
      value={block.id}
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
          aria-label={`Reorder ${label}. Use the up and down arrow keys.`}
          className="cursor-grab select-none px-1 text-neutral-400 active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            // Otherwise the arrow scrolls the page out from under the row.
            e.preventDefault()
            onMove(e.key === 'ArrowUp' ? -1 : 1)
          }}
          disabled={isOnly}
        >
          ⠿
        </button>
        <span className="truncate text-sm">{label}</span>
      </span>
      <span className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={onEdit}>
          View
        </button>
        <button type="button" className={buttonDanger} onClick={onDelete}>
          Delete
        </button>
      </span>
    </Reorder.Item>
  )
}
