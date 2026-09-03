import { useState } from 'react'
import { createBlock, updateBlock } from './api'
import { uploadFile } from './upload'
import { button, field, fileInput, input, label, stack, textarea } from './ui'
import { BLOCK_KINDS, type Block, type BlockKind } from '../types'

interface Props {
  projectId: string
  /** Present when editing; absent when creating. */
  block?: Block
  onSaved: () => void
  onCancel?: () => void
}

const needsFile = (kind: BlockKind) => kind === 'image' || kind === 'document'
const needsUrl = (kind: BlockKind) => kind === 'link' || kind === 'embed'

export default function BlockForm({ projectId, block, onSaved, onCancel }: Props) {
  const [kind, setKind] = useState<BlockKind>(block?.kind ?? 'text')
  const [heading, setHeading] = useState(block?.heading ?? '')
  const [body, setBody] = useState(block?.body ?? '')
  const [url, setUrl] = useState(block?.url ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // The edit form and the add form share the page, so the ids have to be
  // scoped or the labels point at the wrong control.
  const uid = block ? `block-${block.id}` : 'block-new'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      let fileFields = {}

      if (needsFile(kind) && file) {
        setProgress(0)
        const uploaded = await uploadFile(file, setProgress)
        fileFields = {
          url: uploaded.url,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
        }
      } else if (needsFile(kind) && !block?.url) {
        throw new Error('Choose a file to upload')
      }

      // No sortOrder: ordering is drag-and-drop in the list, and a new
      // document is appended by the server.
      const payload = {
        kind,
        heading,
        body,
        ...(needsUrl(kind) ? { url } : {}),
        ...fileFields,
      }

      // The row is written here, after upload() resolves — not in the server's
      // onUploadCompleted webhook, which never fires on localhost.
      if (block) {
        await updateBlock(block.id, payload)
      } else {
        await createBlock({ ...payload, projectId })
        setHeading('')
        setBody('')
        setUrl('')
        setFile(null)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <form onSubmit={submit} className={stack}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={field}>
          <label htmlFor={`${uid}-kind`} className={label}>
            Type
          </label>
          <select
            id={`${uid}-kind`}
            className={input}
            value={kind}
            onChange={(e) => setKind(e.target.value as BlockKind)}
          >
            {BLOCK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={field}>
        <label htmlFor={`${uid}-heading`} className={label}>
          Heading
        </label>
        <input
          id={`${uid}-heading`}
          className={input}
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
        />
      </div>

      <div className={field}>
        <label htmlFor={`${uid}-body`} className={label}>
          {needsFile(kind) ? 'Caption / alt text' : needsUrl(kind) ? 'Link text' : 'Text'}
        </label>
        <textarea
          id={`${uid}-body`}
          className={textarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {needsUrl(kind) && (
        <div className={field}>
          <label htmlFor={`${uid}-url`} className={label}>
            URL
          </label>
          <input
            id={`${uid}-url`}
            type="url"
            className={input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or a Google Drive link"
            required
          />
        </div>
      )}

      {needsFile(kind) && (
        <div className={field}>
          <label htmlFor={`${uid}-file`} className={label}>
            {block?.url ? 'Replace file' : 'File'}
          </label>
          <input
            id={`${uid}-file`}
            type="file"
            accept={kind === 'image' ? 'image/*' : 'application/pdf'}
            className={fileInput}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-neutral-600">
            {file
              ? `Selected: ${file.name}`
              : kind === 'image'
                ? 'Choose an image (JPEG, PNG, WebP, GIF, AVIF or SVG).'
                : 'Choose a PDF.'}
          </p>
          {block?.url && (
            <p className="text-sm">Current: {block.fileName || block.url}</p>
          )}
          {progress !== null && (
            <p className="text-sm">Uploading: {Math.round(progress)}%</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={button} disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" className={button} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </form>
  )
}
