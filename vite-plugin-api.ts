import { readdirSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, relative } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

/**
 * Runs the Vercel functions in `api/` during `vite dev`.
 *
 * Vite's dev server knows nothing about Vercel functions: without this, a
 * request to /api/content resolves to the SOURCE MODULE api/content.ts and
 * comes back as text/javascript with a 200, so the caller's response.json()
 * fails with "Unexpected token 'i'". Worse than a 404, because it looks like a
 * success and it ships server source to the browser.
 *
 * This mirrors Vercel's file-based routing closely enough for local work:
 * /api/admin/login -> api/admin/login.ts, dispatching to the exported handler
 * named after the HTTP method. It is dev-only (`apply: 'serve'`) and has no
 * effect on the production build, where Vercel does the real thing.
 */
export function apiPlugin(): Plugin {
  let server: ViteDevServer

  return {
    name: 'local-vercel-api',
    apply: 'serve',

    configureServer(devServer) {
      server = devServer

      // Added directly (not inside a returned function) so it runs BEFORE
      // Vite's transform middleware gets a chance to serve api/*.ts as source.
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()

        const pathname = url.split('?')[0]
        const modulePath = resolveHandler(server.config.root, pathname)

        if (!modulePath) {
          return sendJson(res, 404, { error: `No API route for ${pathname}` })
        }

        try {
          // ssrLoadModule compiles TypeScript and resolves the extensionless
          // relative imports in lib/, the same way esbuild does on Vercel.
          const mod = await server.ssrLoadModule(modulePath)
          const method = (req.method ?? 'GET').toUpperCase()
          const handler = mod[method] ?? mod.default?.fetch

          if (typeof handler !== 'function') {
            return sendJson(res, 405, {
              error: `${method} not supported by ${pathname}`,
            })
          }

          const response: Response = await handler(await toRequest(req))
          await writeResponse(res, response)
        } catch (e) {
          server.ssrFixStacktrace(e as Error)
          console.error(`[api] ${req.method} ${pathname} failed\n`, e)
          sendJson(res, 500, {
            error: e instanceof Error ? e.message : 'Handler threw',
          })
        }
      })
    },
  }
}

/** /api/admin/login -> <root>/api/admin/login.ts, or null if no such file. */
function resolveHandler(root: string, pathname: string): string | null {
  const apiDir = join(root, 'api')
  const relPath = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '')
  if (relPath === '' || relPath.includes('..')) return null

  const candidate = join(apiDir, `${relPath}.ts`)
  // Guard against path traversal escaping api/.
  if (relative(apiDir, candidate).startsWith('..')) return null

  return existsFile(candidate) ? candidate : null
}

function existsFile(path: string): boolean {
  const dir = path.slice(0, path.lastIndexOf('/'))
  const name = path.slice(path.lastIndexOf('/') + 1)
  try {
    return readdirSync(dir).includes(name)
  } catch {
    return false
  }
}

/** Node IncomingMessage -> web Request. */
async function toRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.url ?? '/', `http://${host}`)
  const method = (req.method ?? 'GET').toUpperCase()

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) headers.append(key, v)
  }

  // GET and HEAD must not carry a body.
  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    body = Buffer.concat(chunks).toString('utf8')
  }

  return new Request(url, { method, headers, body })
}

async function writeResponse(res: ServerResponse, response: Response) {
  response.headers.forEach((value, key) => {
    // Set-Cookie may repeat; getSetCookie preserves each one separately.
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value)
  })

  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)

  res.statusCode = response.status
  const text = await response.text()
  res.end(text)
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}
