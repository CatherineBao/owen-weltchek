import { uploadPresigned } from '@vercel/blob/client'

/**
 * What the store will actually take. Mirrors ALLOWED_CONTENT_TYPES and
 * MAX_UPLOAD_BYTES in api/admin/upload.ts — the signed token is issued against
 * those, so anything outside them is refused by Vercel Blob after the file has
 * already been handed over, as an error with no bearing on what the editor
 * said it wanted. Keeping the two lists in step is what makes the picker's
 * `accept` and the server's allowlist the same promise.
 */
export const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]

export const DOCUMENT_TYPES = ['application/pdf']

/**
 * For a file input's `accept`. Named types rather than `image/*`: the wildcard
 * lets through everything a camera writes — HEIC off an iPhone above all — and
 * those are exactly the files the upload then refuses. Listing the types also
 * gets iOS to hand over a converted JPEG instead of the original HEIC.
 */
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',')
export const DOCUMENT_ACCEPT = DOCUMENT_TYPES.join(',')

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50 MB

/** For the messages below, which are read by a person rather than a machine. */
const IMAGE_NAMES = 'JPEG, PNG, WebP, GIF, AVIF or SVG'

export interface UploadedFile {
  url: string
  fileName: string
  mimeType: string
  fileSize: number
}

/**
 * Sends the file browser -> Vercel Blob directly, with our own endpoint only
 * signing the upload URL. `multipart` splits large files, which keeps big PDFs
 * and camera images reliable.
 */
export async function uploadFile(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<UploadedFile> {
  // Checked here rather than only at the picker, so every path in — a single
  // image, a PDF, a carousel's slides — is refused the same way, and refused
  // before the bytes go anywhere. The store would reject these too, but only
  // after the upload, in its own words.
  if (![...IMAGE_TYPES, ...DOCUMENT_TYPES].includes(file.type)) {
    throw new Error(
      `${file.name} is ${file.type || 'an unrecognised file type'}, which can't be uploaded. ` +
        `Use ${IMAGE_NAMES} for images, or PDF for documents.`,
    )
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`${file.name} is ${mb} MB. The limit is 50 MB.`)
  }

  const blob = await uploadPresigned(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/upload',
    multipart: file.size > 5 * 1024 * 1024,
    onUploadProgress: onProgress
      ? ({ percentage }) => onProgress(percentage)
      : undefined,
  })

  return {
    url: blob.url,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  }
}
