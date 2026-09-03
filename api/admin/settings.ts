import { isAuthed } from '../../lib/auth'
import { safeDeleteBlobs } from '../../lib/blobs'
import { db } from '../../lib/db'
import { error, json, readJson } from '../../lib/http'
import { SETTING_KEYS, type SettingKey, siteSettings } from '../../lib/schema'

const isSettingKey = (k: string): k is SettingKey =>
  (SETTING_KEYS as readonly string[]).includes(k)

async function readAll(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteSettings)
  const out: Record<string, string> = {}
  for (const row of rows) out[row.key] = row.value
  return out
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')
  return json({ settings: await readAll() })
}

/** Upserts the given keys. Unknown keys are rejected rather than silently kept. */
export async function PUT(request: Request): Promise<Response> {
  if (!isAuthed(request)) return error(401, 'Unauthorized')

  const body = await readJson<Record<string, unknown>>(request)
  if (!body) return error(400, 'Invalid JSON body')

  const entries: [SettingKey, string][] = []
  for (const [key, value] of Object.entries(body)) {
    if (!isSettingKey(key)) return error(400, `Unknown setting: ${key}`)
    if (typeof value !== 'string') return error(400, `Setting ${key} must be a string`)
    entries.push([key, value])
  }
  if (entries.length === 0) return error(400, 'No settings given')

  const previous = await readAll()

  await Promise.all(
    entries.map(([key, value]) =>
      db
        .insert(siteSettings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value, updatedAt: new Date() },
        }),
    ),
  )

  // Replacing the resume should not leave the old PDF behind.
  const nextResume = entries.find(([k]) => k === 'resume_url')?.[1]
  if (nextResume !== undefined && previous.resume_url && previous.resume_url !== nextResume) {
    await safeDeleteBlobs([previous.resume_url])
  }

  return json({ settings: await readAll() })
}
