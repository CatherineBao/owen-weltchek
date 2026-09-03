import { isAuthed } from '../../lib/auth.js'
import { db } from '../../lib/db.js'
import { error, json, readJson } from '../../lib/http.js'
import { SETTING_KEYS, type SettingKey, siteSettings } from '../../lib/schema.js'

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

  return json({ settings: await readAll() })
}
