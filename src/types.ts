/**
 * Hand-written mirror of lib/schema.ts.
 *
 * Deliberately NOT imported from there: one accidental value import would pull
 * drizzle-orm into the browser bundle, and the server tsconfig has different
 * libs. Keep the two in sync by hand — it's a short list.
 *
 * Timestamps arrive as ISO strings over JSON, not Date objects.
 */

export type BlockKind = 'text' | 'image' | 'document' | 'link' | 'embed'

export const BLOCK_KINDS: readonly BlockKind[] = [
  'text',
  'image',
  'document',
  'link',
  'embed',
]

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
  // A link now, not an upload: the resume lives wherever it already lives
  // (Drive, a PDF host) and is swapped by pasting a new URL.
  'resume_url',
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

export type Settings = Partial<Record<SettingKey, string>>

export interface ContentResponse {
  projects: ProjectWithBlocks[]
  settings: Settings
}
