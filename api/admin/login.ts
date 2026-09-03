import { checkPassword, createSessionCookie } from '../../lib/auth'
import { error, json, readJson } from '../../lib/http'

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<{ password?: unknown }>(request)

  if (!body || !checkPassword(body.password)) {
    // Slow the response down a little so online guessing is tedious. A real
    // rate limiter would need a shared datastore; per-instance memory is
    // meaningless across serverless instances.
    await new Promise((resolve) => setTimeout(resolve, 300))
    return error(401, 'Incorrect password')
  }

  return json({ ok: true }, { headers: { 'Set-Cookie': createSessionCookie() } })
}
