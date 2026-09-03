import { eq } from 'drizzle-orm'
import { isAuthed } from '../../lib/auth'
import { safeDeleteBlobs } from '../../lib/blobs'
import { db } from '../../lib/db'
import { error, idParam, json, noContent, readJson } from '../../lib/http'
import { BLOCK_KINDS, type BlockKind, blocks, projects } from '../../lib/schema'

type BlockInput = {
  projectId?: unknown
  kind?: unknown
  heading?: unknown
  body?: unknown
  url?: unknown
  fileName?: unknown
  mimeType?: unknown
  fileSize?: unknown
  meta?: unknown
  sortOrder?: unknown
}

const isKind = (v: unknown): v is BlockKind =>
  typeof v === 'string' && (BLOCK_KINDS as readonly string[]).includes(v)

function clean(input: BlockInput) {
  const out: Record<string, unknown> = {}
  if (isKind(input.kind)) out.kind = input.kind
  if (typeof input.heading === 'string') out.heading = input.heading.trim() || null
  if (typeof input.body === 'string') out.body = input.body || null
  if (typeof input.url === 'string') out.url = input.url.trim() || null
  if (typeof input.fileName === 'string') out.fileName = input.fileName || null
  if (typeof input.mimeType === 'string') out.mimeType = input.mimeType || null
  if (typeof input.fileSize === 'number') out.fileSize = Math.trunc(input.fileSize)
  if (typeof input.sortOrder === 'number') out.sortOrder = Math.trunc(input.sortOrder)
  if (input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)) {
    out.meta = input.meta
  }
  return out
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const input = await readJson<BlockInput>(request)
  if (!input) return error(400, 'Invalid JSON body')

  const projectId = input.projectId
  if (typeof projectId !== 'string') return error(400, 'projectId is required')

  // Explicit existence check: the FK would reject this anyway, but as an
  // opaque 500 rather than a message the admin UI can show.
  const parent = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
  if (parent.length === 0) return error(404, 'Project not found')

  const [block] = await db
    .insert(blocks)
    .values({ ...clean(input), projectId })
    .returning()
  return json({ block }, { status: 201 })
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const id = idParam(request)
  if (!id) return error(400, 'A valid ?id= is required')

  const input = await readJson<BlockInput>(request)
  if (!input) return error(400, 'Invalid JSON body')

  const values = clean(input)
  if (Object.keys(values).length === 0) return error(400, 'No updatable fields given')

  // Replacing an uploaded file leaves the old one behind unless we clear it.
  const [existing] = await db
    .select({ url: blocks.url })
    .from(blocks)
    .where(eq(blocks.id, id))
  if (!existing) return error(404, 'Block not found')

  const [block] = await db.update(blocks).set(values).where(eq(blocks.id, id)).returning()

  if (typeof values.url === 'string' && existing.url && existing.url !== values.url) {
    await safeDeleteBlobs([existing.url])
  }

  return json({ block })
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const id = idParam(request)
  if (!id) return error(400, 'A valid ?id= is required')

  const [deleted] = await db
    .delete(blocks)
    .where(eq(blocks.id, id))
    .returning({ url: blocks.url })
  if (!deleted) return error(404, 'Block not found')

  await safeDeleteBlobs([deleted.url])
  return noContent()
}
