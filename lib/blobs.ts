import { del } from '@vercel/blob'

/**
 * Only URLs we uploaded are ours to delete. A block's `url` may just as easily
 * be a pasted YouTube or Google Drive link, which must never be touched.
 */
export function isOwnBlob(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    return new URL(url).hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

/**
 * Deletes uploaded files, ignoring anything external. Never throws: a failed
 * cleanup should not block the row deletion the caller is really doing — it
 * leaves an orphaned file, which is recoverable, whereas a 500 here would
 * leave the user unable to delete their own content.
 */
export async function safeDeleteBlobs(
  urls: (string | null | undefined)[],
): Promise<void> {
  const ours = urls.filter(isOwnBlob)
  if (ours.length === 0) return

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('BLOB_READ_WRITE_TOKEN not set; skipping blob cleanup for', ours)
    return
  }

  try {
    await del(ours)
  } catch (e) {
    console.error('Blob cleanup failed (files orphaned, rows still deleted)', e)
  }
}
