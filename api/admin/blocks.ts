import { and, eq, sql } from 'drizzle-orm'
import { isAuthed } from '../../lib/auth.js'
import { safeDeleteBlobs } from '../../lib/blobs.js'
import { db } from '../../lib/db.js'
import { error, idParam, json, noContent, readJson } from '../../lib/http.js'
import {
  BLOCK_KINDS,
  type BlockKind,
  blocks,
  carouselImagesFromMeta,
  projects,
} from '../../lib/schema.js'

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

/** Gaps leave room to slot one in by hand without renumbering. */
const ORDER_STEP = 10

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    // Carousel slides are re-read rather than trusted: they arrive as jsonb and
    // are printed straight onto the public page, so an entry without a usable
    // url is dropped here instead of rendering as a broken image later.
    const { images, ...rest } = input.meta as Record<string, unknown>
    out.meta =
      images === undefined
        ? rest
        : { ...rest, images: carouselImagesFromMeta({ images }) }
  }
  return out
}

/** Every uploaded file a block owns: its own, plus any carousel slides. */
function blockFileUrls(row: { url: string | null; meta: unknown }): string[] {
  return [
    ...(row.url ? [row.url] : []),
    ...carouselImagesFromMeta(row.meta).map((image) => image.url),
  ]
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

  const values = clean(input)

  // Order is drag-and-drop now, so nothing sends a number on create. Land the
  // new document at the end of its project's list rather than tied at 0.
  if (values.sortOrder === undefined) {
    const [last] = await db
      .select({ max: sql<number | null>`max(${blocks.sortOrder})` })
      .from(blocks)
      .where(eq(blocks.projectId, projectId))
    values.sortOrder = (last?.max ?? -ORDER_STEP) + ORDER_STEP
  }

  const [block] = await db
    .insert(blocks)
    .values({ ...values, projectId })
    .returning()
  return json({ block }, { status: 201 })
}

/**
 * Rewrites one project's ordering from a list of ids, in the order given.
 *
 * A list rather than one index per request: a drag moves one document but
 * renumbers every document after it, and separate PATCHes would leave the list
 * half-renumbered if one of them failed.
 */
export async function PUT(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const body = await readJson<{ projectId?: unknown; ids?: unknown }>(request)
  if (!body) return error(400, 'Invalid JSON body')

  const { projectId, ids } = body
  if (typeof projectId !== 'string' || !UUID.test(projectId)) {
    return error(400, 'A valid projectId is required')
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return error(400, 'ids must be a non-empty array')
  }
  if (!ids.every((id) => typeof id === 'string' && UUID.test(id))) {
    return error(400, 'ids must all be uuids')
  }
  if (new Set(ids).size !== ids.length) return error(400, 'ids must be unique')

  // Scoped to the project as well as the id: without it, a caller could
  // renumber documents belonging to a project they never named.
  await db.transaction(async (tx) => {
    for (const [index, id] of (ids as string[]).entries()) {
      await tx
        .update(blocks)
        .set({ sortOrder: index * ORDER_STEP })
        .where(and(eq(blocks.id, id), eq(blocks.projectId, projectId)))
    }
  })

  return noContent()
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
    .select({ url: blocks.url, meta: blocks.meta })
    .from(blocks)
    .where(eq(blocks.id, id))
  if (!existing) return error(404, 'Block not found')

  const [block] = await db.update(blocks).set(values).where(eq(blocks.id, id)).returning()

  // Whatever the block used to point at and no longer does — the replaced file,
  // or the slides removed from a carousel in this same save. Compared by url
  // rather than by field, so a slide promoted to the block's own url (or the
  // reverse) isn't deleted out from under the row that still uses it.
  const kept = new Set(blockFileUrls(block))
  const dropped = blockFileUrls(existing).filter((url) => !kept.has(url))
  if (dropped.length > 0) await safeDeleteBlobs(dropped)

  return json({ block })
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const id = idParam(request)
  if (!id) return error(400, 'A valid ?id= is required')

  const [deleted] = await db
    .delete(blocks)
    .where(eq(blocks.id, id))
    .returning({ url: blocks.url, meta: blocks.meta })
  if (!deleted) return error(404, 'Block not found')

  await safeDeleteBlobs(blockFileUrls(deleted))
  return noContent()
}
