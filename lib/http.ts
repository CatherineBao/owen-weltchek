export function json(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init.headers },
  })
}

export function error(status: number, message: string): Response {
  return json({ error: message }, { status })
}

export function noContent(headers: HeadersInit = {}): Response {
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })
}

/** Reads ?id= and rejects anything that isn't a UUID. */
export function idParam(request: Request): string | null {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return null
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuid.test(id) ? id : null
}

/** Parses a JSON body, returning null rather than throwing on bad input. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return null
    }
    return body as T
  } catch {
    return null
  }
}
