import { clearSessionCookie } from '../../lib/auth'
import { noContent } from '../../lib/http'

export function POST(): Response {
  return noContent({ 'Set-Cookie': clearSessionCookie() })
}
