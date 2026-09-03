import { isAuthed } from '../../lib/auth'
import { json } from '../../lib/http'

/**
 * The session cookie is HttpOnly, so the admin page can't read it directly —
 * it asks here instead.
 */
export function GET(request: Request): Response {
  return json({ authed: isAuthed(request) })
}
