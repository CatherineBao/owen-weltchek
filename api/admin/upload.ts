import { issueSignedToken } from '@vercel/blob'
import {
  type HandleUploadPresignedBody,
  handleUploadPresigned,
} from '@vercel/blob/client'
import { isAuthed } from '../../lib/auth.js'
import { error, json } from '../../lib/http.js'

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

/** How long a delegation is good for. The upload URL itself expires sooner. */
const TOKEN_TTL_MS = 60 * 60 * 1000

/** A month, matching Vercel's own default for public blobs. */
const CACHE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

/**
 * Hands the browser a presigned URL so it can PUT the file straight to Vercel
 * Blob. The bytes never pass through this function, which is the point: a
 * serverless request body is capped at 4.5 MB, so anything larger — a scanned
 * PDF, a photo off a real camera — would 413 if it were proxied here.
 *
 * Presigned rather than handleUpload's client tokens: handleUpload can only
 * sign with a static BLOB_READ_WRITE_TOKEN, and this store authenticates with
 * OIDC, which the SDK refuses for that method. The presigned flow accepts
 * either credential, so it works both on Vercel and locally.
 */
export async function POST(request: Request): Promise<Response> {
  // Cheap pre-check so an anonymous caller gets a clean 401 rather than the
  // 400 a thrown error would produce. The authoritative check is inside
  // getSignedToken below.
  //
  // One exception: the upload-completed callback is a server-to-server webhook
  // from Vercel Blob and carries no admin cookie. It authenticates by its
  // Ed25519 signature instead, which handleUploadPresigned verifies against
  // BLOB_WEBHOOK_PUBLIC_KEY.
  let body: HandleUploadPresignedBody
  try {
    body = (await request.json()) as HandleUploadPresignedBody
  } catch {
    return error(400, 'Invalid JSON body')
  }

  const isCallback = body.type === 'blob.upload-completed'
  if (!isCallback && !isAuthed(request)) return error(401, 'Unauthorized')

  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        // THE security boundary. Without this the route hands out upload URLs
        // to anyone who can reach it.
        if (!isAuthed(request)) throw new Error('Not authenticated')

        return {
          // Scoped to this one pathname and to writes only, so a leaked URL
          // can't be replayed to read or delete anything else in the store.
          token: await issueSignedToken({
            pathname,
            operations: ['put'],
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            validUntil: Date.now() + TOKEN_TTL_MS,
          }),
          urlOptions: {
            access: 'public',
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            addRandomSuffix: true,
            allowOverwrite: false,
            cacheControlMaxAge: CACHE_MAX_AGE_SECONDS,
            // Minutes, not the token's hour: the browser starts the upload
            // immediately, so a long-lived URL only widens the window.
            validUntil: Date.now() + 10 * 60 * 1000,
          },
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Logging only. This is a webhook from Vercel Blob and never fires on
        // localhost, so the database row is written by the client after the
        // upload resolves — same code path in dev and production.
        console.log('blob upload completed:', blob.url)
      },
    })
    return json(result)
  } catch (e) {
    console.error('POST /api/admin/upload failed', e)
    const message = e instanceof Error ? e.message : 'Upload failed'
    return error(message === 'Not authenticated' ? 401 : 400, message)
  }
}
