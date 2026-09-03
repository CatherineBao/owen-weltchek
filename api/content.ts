import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { error, json } from '../lib/http'
import { blocks, projects, siteSettings } from '../lib/schema'

/**
 * The whole public site in one request. Published projects only, each with its
 * blocks nested and ordered — one round trip, not N+1.
 */
export async function GET(): Promise<Response> {
  try {
    const [rows, settingRows] = await Promise.all([
      db.query.projects.findMany({
        where: eq(projects.published, true),
        orderBy: [asc(projects.sortOrder), desc(projects.createdAt)],
        with: {
          blocks: {
            orderBy: [asc(blocks.sortOrder), asc(blocks.createdAt)],
          },
        },
      }),
      db.select().from(siteSettings),
    ])

    const settings: Record<string, string> = {}
    for (const row of settingRows) settings[row.key] = row.value

    return json({ projects: rows, settings })
  } catch (e) {
    console.error('GET /api/content failed', e)
    return error(500, 'Failed to load content')
  }
}
