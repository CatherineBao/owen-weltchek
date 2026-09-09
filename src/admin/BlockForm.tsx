import { useState } from 'react'
import CarouselEditor from './CarouselEditor'
import {
  type EditorSlide,
  revokeSlidePreviews,
  toEditorSlides,
  uploadSlides,
} from './carouselSlides'
import { createBlock, updateBlock } from './api'
import { DOCUMENT_ACCEPT, IMAGE_ACCEPT, uploadFile } from './upload'
import {
  alert,
  breakable,
  button,
  buttonSave,
  field,
  fileInput,
  input,
  label,
  stack,
  textarea,
} from './ui'
import { BLOCK_KINDS, type Block, type BlockKind, carouselImages } from '../types'

interface Props {
  projectId: string
  /** Present when editing; absent when creating. */
  block?: Block
  onSaved: () => void
  onCancel?: () => void
}

const needsFile = (kind: BlockKind) => kind === 'image' || kind === 'document'
const needsUrl = (kind: BlockKind) => kind === 'link' || kind === 'embed'

/** What the body field is for, which differs by kind more than the label does. */
function bodyLabel(kind: BlockKind) {
  if (kind === 'carousel') return 'Intro (Show Above)'
  if (needsFile(kind)) return 'Caption / alt text'
  if (needsUrl(kind)) return 'Link text'
  return 'Text'
}

export default function BlockForm({ projectId, block, onSaved, onCancel }: Props) {
  const [kind, setKind] = useState<BlockKind>(block?.kind ?? 'text')
  const [heading, setHeading] = useState(block?.heading ?? '')
  const [body, setBody] = useState(block?.body ?? '')
  const [url, setUrl] = useState(block?.url ?? '')
  const [file, setFile] = useState<File | null>(null)
  // Carousel slides. Held here rather than in the editor so that submit can
  // upload them; the editor below only adds, captions, and reorders.
  const [slides, setSlides] = useState<EditorSlide[]>(() =>
    block ? toEditorSlides(carouselImages(block)) : [],
  )
  const [progress, setProgress] = useState<number | null>(null)
  const [progressNote, setProgressNote] = useState<string | null>(null)
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
      let meta: Record<string, unknown> | undefined

      if (kind === 'carousel') {
        if (slides.length === 0) throw new Error('Add at least one image')
        setProgress(0)
        const images = await uploadSlides(slides, (done, total, percentage) => {
          setProgressNote(total > 1 ? `Image ${Math.min(done + 1, total)} of ${total}` : null)
          setProgress(percentage)
        })
        meta = { ...block?.meta, images }
      } else if (needsFile(kind) && file) {
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
        ...(meta ? { meta } : {}),
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
        // The files are in the blob store now; the local previews are spent.
        revokeSlidePreviews(slides)
        setSlides([])
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
      setProgress(null)
      setProgressNote(null)
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
          {bodyLabel(kind)}
        </label>
        <textarea
          id={`${uid}-body`}
          className={textarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {kind === 'carousel' && (
        <div className={`${field} min-w-0`}>
          <CarouselEditor
            uid={uid}
            slides={slides}
            onChange={setSlides}
            disabled={busy}
          />
          {progress !== null && (
            <p className="text-sm">
              {progressNote ? `${progressNote} — ` : ''}
              Uploading: {Math.round(progress)}%
            </p>
          )}
        </div>
      )}

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
        <div className={`${field} min-w-0`}>
          <label htmlFor={`${uid}-file`} className={label}>
            {block?.url ? 'Replace file' : 'File'}
          </label>
          <input
            id={`${uid}-file`}
            type="file"
            accept={kind === 'image' ? IMAGE_ACCEPT : DOCUMENT_ACCEPT}
            className={fileInput}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className={`${breakable} text-sm text-neutral-600`}>
            {file
              ? `Selected: ${file.name}`
              : kind === 'image'
                ? 'Choose an image (JPEG, PNG, WebP, GIF, AVIF or SVG).'
                : 'Choose a PDF.'}
          </p>
          {block?.url && (
            <p className={`${breakable} text-sm`}>Current: {block.fileName || block.url}</p>
          )}
          {progress !== null && (
            <p className="text-sm">Uploading: {Math.round(progress)}%</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={buttonSave} disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" className={button} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className={alert}>
          {error}
        </p>
      )}
    </form>
  )
}
