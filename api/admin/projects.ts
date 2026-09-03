import { asc, desc, eq } from 'drizzle-orm'
import { isAuthed } from '../../lib/auth'
import { safeDeleteBlobs } from '../../lib/blobs'
import { db } from '../../lib/db'
import { error, idParam, json, noContent, readJson } from '../../lib/http'
import { blocks, projects } from '../../lib/schema'

type ProjectInput = {
  title?: unknown
  subtitle?: unknown
  year?: unknown
  sortOrder?: unknown
  published?: unknown
}

/** Picks only the fields a client may set, coercing each to the right type. */
function clean(body: ProjectInput) {
  const out: Record<string, unknown> = {}
  if (typeof body.title === 'string') out.title = body.title.trim()
  if (typeof body.subtitle === 'string') out.subtitle = body.subtitle.trim() || null
  if (typeof body.year === 'string') out.year = body.year.trim() || null
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

  const [project] = await db
    .insert(projects)
    .values(values as { title: string })
    .returning()
  return json({ project }, { status: 201 })
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
