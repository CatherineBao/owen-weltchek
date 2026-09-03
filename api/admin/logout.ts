import { clearSessionCookie } from '../../lib/auth.js'
import { noContent } from '../../lib/http.js'

export function POST(): Response {
  return noContent({ 'Set-Cookie': clearSessionCookie() })
}
