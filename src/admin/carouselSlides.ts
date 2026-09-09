/**
 * The editing-time shape of a carousel's slides, and the two conversions at
 * either end of it: saved images in, uploaded images out.
 *
 * Separate from the component so the form that submits them can import
 * `uploadSlides` without importing a component, which is what keeps fast
 * refresh working for both files.
 */
import { uploadFile } from './upload'
import type { CarouselImage } from '../types'

/**
 * One slide while it's being edited. Either it is already in the blob store
 * (`url`, from a previous save) or it is a file the browser is still holding
 * (`file`, chosen a moment ago) — never both. `preview` points at whichever of
 * the two can be shown right now.
 */
export interface EditorSlide {
  /** Stable across re-renders and reorders; a url isn't (a slide may share
      one with another, and a pending file has none). React keys and the
      caption inputs both hang off this. */
  key: string
  caption: string
  preview: string
  url?: string
  file?: File
  fileName?: string
  mimeType?: string
  fileSize?: number
}

let counter = 0
const nextKey = () => `slide-${(counter += 1)}`

/** Saved slides, reopened for editing. */
export function toEditorSlides(images: CarouselImage[]): EditorSlide[] {
  return images.map((image) => ({
    key: nextKey(),
    caption: image.caption,
    preview: image.url,
    url: image.url,
    fileName: image.fileName,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
  }))
}

/**
 * Files just chosen in the picker. The object URL lets the slide be seen and
 * captioned before anything is uploaded; `revokeSlidePreviews` releases it.
 */
export function toPendingSlides(files: File[]): EditorSlide[] {
  return files.map((file) => ({
    key: nextKey(),
    caption: '',
    preview: URL.createObjectURL(file),
    file,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  }))
}

/** Object URLs are held by the document until released, file and all. */
export function revokeSlidePreviews(slides: EditorSlide[]) {
  for (const slide of slides) {
    if (slide.file) URL.revokeObjectURL(slide.preview)
  }
}

/**
 * Uploads whatever is still only a File and returns the slides as they'll be
 * stored.
 *
 * Called from the form's submit rather than from the file picker, so that
 * abandoning a half-written carousel uploads nothing: everything in the editor
 * up to that point is local. One file at a time — a dozen phone photos at once
 * would compete for the same connection and make the progress meaningless.
 */
export async function uploadSlides(
  slides: EditorSlide[],
  onProgress?: (done: number, total: number, percentage: number) => void,
): Promise<CarouselImage[]> {
  const pending = slides.filter((slide) => slide.file)
  const out: CarouselImage[] = []
  let done = 0

  for (const slide of slides) {
    if (!slide.file) {
      // Already uploaded on an earlier save; only the caption can have changed.
      out.push({
        url: slide.url as string,
        caption: slide.caption,
        fileName: slide.fileName,
        mimeType: slide.mimeType,
        fileSize: slide.fileSize,
      })
      continue
    }

    const uploaded = await uploadFile(slide.file, (percentage) =>
      onProgress?.(done, pending.length, percentage),
    )
    done += 1
    onProgress?.(done, pending.length, 100)
    out.push({
      url: uploaded.url,
      caption: slide.caption,
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.fileSize,
    })
  }

  return out
}
