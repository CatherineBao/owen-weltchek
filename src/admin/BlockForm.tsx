import { useState } from 'react'
import { createBlock, updateBlock } from './api'
import { uploadFile } from './upload'
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
  const [sortOrder, setSortOrder] = useState(block?.sortOrder ?? 0)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

      const payload = {
        kind,
        heading,
        body,
        sortOrder,
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
    <form onSubmit={submit}>
      <label htmlFor="kind">Type</label>
      <select
        id="kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as BlockKind)}
      >
        {BLOCK_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>

      <label htmlFor="heading">Heading</label>
      <input
        id="heading"
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
      />

      <label htmlFor="body">
        {needsFile(kind) ? 'Caption / alt text' : needsUrl(kind) ? 'Link text' : 'Text'}
      </label>
      <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} />

      {needsUrl(kind) && (
        <>
          <label htmlFor="url">URL</label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or a Google Drive link"
            required
          />
        </>
      )}

      {needsFile(kind) && (
        <>
          <label htmlFor="file">
            {block?.url ? 'Replace file' : 'File'}
          </label>
          <input
            id="file"
            type="file"
            accept={kind === 'image' ? 'image/*' : 'application/pdf'}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {block?.url && <p>Current: {block.fileName || block.url}</p>}
          {progress !== null && <p>Uploading: {Math.round(progress)}%</p>}
        </>
      )}

      <label htmlFor="sortOrder">Order</label>
      <input
        id="sortOrder"
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(Number(e.target.value))}
      />

      <button type="submit" disabled={busy}>
        {busy ? 'Saving...' : block ? 'Save block' : 'Add block'}
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
