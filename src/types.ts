/**
 * Hand-written mirror of lib/schema.ts.
 *
 * Deliberately NOT imported from there: one accidental value import would pull
 * drizzle-orm into the browser bundle, and the server tsconfig has different
 * libs. Keep the two in sync by hand — it's a short list.
 *
 * Timestamps arrive as ISO strings over JSON, not Date objects.
 */

export type BlockKind = 'text' | 'image' | 'carousel' | 'document' | 'link' | 'embed'

export const BLOCK_KINDS: readonly BlockKind[] = [
  'text',
  'image',
  'carousel',
  'document',
  'link',
  'embed',
]

/** One slide of a kind='carousel' block. Lives in `meta.images`. */
export interface CarouselImage {
  url: string
  /** Per-slide caption; doubles as the alt text. May be blank. */
  caption: string
  fileName?: string
  mimeType?: string
  fileSize?: number
}

export interface Block {
  id: string
  projectId: string
  kind: BlockKind
  heading: string | null
  body: string | null
  url: string | null
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  meta: Record<string, unknown>
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  title: string
  description: string | null
  /** "YYYY-MM". Blank end with a start set means ongoing. */
  startDate: string | null
  endDate: string | null
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export type ProjectWithBlocks = Project & { blocks: Block[] }

/**
 * The slides of a carousel block, or an empty list for anything else.
 *
 * `meta` is jsonb, so its shape is a promise rather than a guarantee: rows
 * written before the carousel kind existed have `{}`, and a hand-edited row
 * could hold anything. Every reader goes through here so a malformed row
 * renders as an empty carousel instead of throwing on the public site.
 */
export function carouselImages(block: Block): CarouselImage[] {
  const raw = block.meta?.images
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { url, caption, fileName, mimeType, fileSize } = item as Record<string, unknown>
    if (typeof url !== 'string' || !url) return []
    return [
      {
        url,
        caption: typeof caption === 'string' ? caption : '',
        ...(typeof fileName === 'string' ? { fileName } : {}),
        ...(typeof mimeType === 'string' ? { mimeType } : {}),
        ...(typeof fileSize === 'number' ? { fileSize } : {}),
      },
    ]
  })
}

export const SETTING_KEYS = [
  'site_title',
  'site_tagline',
  'site_school',
  'site_degree',
  'about_body',
  'contact_email',
  'contact_phone',
  'linkedin_url',
  'portfolio_url',
  // Retired: nothing on the site or in the editor reads this any more. The key
  // is kept known on purpose — the settings form PUTs back every row it loaded,
  // and the API rejects unknown keys, so dropping it here would 400 the whole
  // save for any database that still carries a `resume_url` row. Delete the row
  // first, then the key.
  'resume_url',
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

export type Settings = Partial<Record<SettingKey, string>>

export interface ContentResponse {
  projects: ProjectWithBlocks[]
  settings: Settings
}
