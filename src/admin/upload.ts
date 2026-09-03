import { uploadPresigned } from '@vercel/blob/client'

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
