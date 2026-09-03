import { type HandleUploadBody, handleUpload } from '@vercel/blob/client'
import { isAuthed } from '../../lib/auth'
import { error, json } from '../../lib/http'

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
]

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50 MB

/**
 * Mints a scoped, short-lived token so the browser can PUT the file straight to
 * Vercel Blob. The bytes never pass through this function, which is the point:
 * a serverless request body is capped at 4.5 MB, so anything larger — a scanned
 * PDF, a photo off a real camera — would 413 if it were proxied here.
 */
export async function POST(request: Request): Promise<Response> {
  // Cheap pre-check so an anonymous caller gets a clean 401 rather than the
  // 400 that handleUpload's thrown error would produce. The authoritative
  // check is inside onBeforeGenerateToken below.
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return error(400, 'Invalid JSON body')
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // THE security boundary. Without this the route hands out write tokens
        // to anyone who can reach the URL.
        if (!isAuthed(request)) throw new Error('Not authenticated')
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Logging only. This is a webhook from Vercel Blob and never fires on
        // localhost, so the database row is written by the client after
        // upload() resolves — same code path in dev and production.
        console.log('blob upload completed:', blob.url)
      },
    })
    return json(result)
  } catch (e) {
    console.error('POST /api/admin/upload failed', e)
    return error(400, e instanceof Error ? e.message : 'Upload failed')
  }
}
