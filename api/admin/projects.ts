import { asc, desc, eq, sql } from 'drizzle-orm'
import { isAuthed } from '../../lib/auth.js'
import { safeDeleteBlobs } from '../../lib/blobs.js'
import { db } from '../../lib/db.js'
import { error, idParam, json, noContent, readJson } from '../../lib/http.js'
import { blocks, projects } from '../../lib/schema.js'

type ProjectInput = {
  title?: unknown
  description?: unknown
  startDate?: unknown
  endDate?: unknown
  sortOrder?: unknown
  published?: unknown
}

/** Gaps leave room to slot a project in by hand without renumbering. */
const ORDER_STEP = 10

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** "YYYY-MM" or null. Anything else a client sends is dropped, not stored. */
function month(value: string): string | null {
  const trimmed = value.trim()
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed) ? trimmed : null
}

/** Picks only the fields a client may set, coercing each to the right type. */
function clean(body: ProjectInput) {
  const out: Record<string, unknown> = {}
  if (typeof body.title === 'string') out.title = body.title.trim()
  if (typeof body.description === 'string') {
    // Only the edges: interior blank lines are the paragraph breaks.
    out.description = body.description.trim() || null
  }
  if (typeof body.startDate === 'string') out.startDate = month(body.startDate)
  if (typeof body.endDate === 'string') out.endDate = month(body.endDate)
  if (typeof body.sortOrder === 'number') out.sortOrder = Math.trunc(body.sortOrder)
  if (typeof body.published === 'boolean') out.published = body.published
  return out
}

/** All projects with their blocks, drafts included. */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const rows = await db.query.projects.findMany({
    orderBy: [asc(projects.sortOrder), desc(projects.createdAt)],
    with: { blocks: { orderBy: [asc(blocks.sortOrder), asc(blocks.createdAt)] } },
  })
  return json({ projects: rows })
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const body = await readJson<ProjectInput>(request)
  if (!body) return error(400, 'Invalid JSON body')

  const values = clean(body)
  if (typeof values.title !== 'string' || values.title === '') {
    return error(400, 'title is required')
  }

  // Order is drag-and-drop now, so nothing sends a number on create. Land the
  // new project at the end of the list rather than tied with everything at 0.
  if (values.sortOrder === undefined) {
    const [last] = await db
      .select({ max: sql<number | null>`max(${projects.sortOrder})` })
      .from(projects)
    values.sortOrder = (last?.max ?? -ORDER_STEP) + ORDER_STEP
  }

  const [project] = await db
    .insert(projects)
    .values(values as { title: string })
    .returning()
  return json({ project }, { status: 201 })
}

/**
 * Rewrites the whole ordering from a list of ids, in the order given.
 *
 * A list rather than one index per request: a drag moves one project but
 * renumbers every project after it, and sending those as separate PATCHes
 * would leave the list half-renumbered if one of them failed.
 */
export async function PUT(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const body = await readJson<{ ids?: unknown }>(request)
  if (!body) return error(400, 'Invalid JSON body')

  const ids = body.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return error(400, 'ids must be a non-empty array')
  }
  if (!ids.every((id) => typeof id === 'string' && UUID.test(id))) {
    return error(400, 'ids must all be uuids')
  }
  if (new Set(ids).size !== ids.length) return error(400, 'ids must be unique')

  // One transaction: the list is either fully renumbered or untouched.
  await db.transaction(async (tx) => {
    for (const [index, id] of (ids as string[]).entries()) {
      await tx
        .update(projects)
        .set({ sortOrder: index * ORDER_STEP })
        .where(eq(projects.id, id))
    }
  })

  return noContent()
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const id = idParam(request)
  if (!id) return error(400, 'A valid ?id= is required')

  const body = await readJson<ProjectInput>(request)
  if (!body) return error(400, 'Invalid JSON body')

  const values = clean(body)
  if ('title' in values && values.title === '') {
    return error(400, 'title cannot be empty')
  }
  if (Object.keys(values).length === 0) return error(400, 'No updatable fields given')

  const [project] = await db
    .update(projects)
    .set(values)
    .where(eq(projects.id, id))
    .returning()
  if (!project) return error(404, 'Project not found')

  return json({ project })
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const id = idParam(request)
  if (!id) return error(400, 'A valid ?id= is required')

  // Order matters. The FK cascade removes the block rows, so the file URLs have
  // to be collected and deleted BEFORE the project row goes away — otherwise
  // the uploads are orphaned with nothing left pointing at them.
  const children = await db
    .select({ url: blocks.url })
    .from(blocks)
    .where(eq(blocks.projectId, id))
  await safeDeleteBlobs(children.map((c) => c.url))

  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id })
  if (!deleted) return error(404, 'Project not found')

  return noContent()
}
