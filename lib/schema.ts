import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/** A unit of work. Owns an ordered list of blocks. */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    // Long-form: paragraphs of prose, not a one-line tagline.
    description: text('description'),
    // "YYYY-MM" — month precision, because a project starts in a month, not a
    // day. Text, not date: Postgres has no month type and the strings sort
    // correctly as-is. A blank endDate with a startDate set means ongoing.
    startDate: text('start_date'),
    endDate: text('end_date'),
    sortOrder: integer('sort_order').notNull().default(0),
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('projects_sort_idx').on(t.sortOrder, t.createdAt)],
)

/**
 * One block = one paragraph, image, carousel, document, link, or embed inside
 * a project.
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

/**
 * One slide of a kind='carousel' block, stored in `meta.images`.
 *
 * In the jsonb column rather than in child rows: a carousel is edited and
 * deleted as a single thing, and slides have no identity outside the block
 * that owns them, so a table of them would buy ordering and joins we'd only
 * have to keep in step by hand.
 */
export interface CarouselImage {
  url: string
  /** Per-slide caption; doubles as the alt text. May be blank. */
  caption: string
  fileName?: string
  mimeType?: string
  fileSize?: number
}

/**
 * The slides a `meta` holds, dropping anything that isn't one.
 *
 * jsonb promises a shape rather than enforcing one — a row written before this
 * kind existed holds `{}` — so both the validator on the way in and the blob
 * cleanup on the way out read it through here.
 */
export function carouselImagesFromMeta(meta: unknown): CarouselImage[] {
  const raw = (meta as { images?: unknown } | null | undefined)?.images
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const { url, caption, fileName, mimeType, fileSize } = item as Record<string, unknown>
    if (typeof url !== 'string' || !url.trim()) return []
    return [
      {
        url: url.trim(),
        caption: typeof caption === 'string' ? caption : '',
        ...(typeof fileName === 'string' ? { fileName } : {}),
        ...(typeof mimeType === 'string' ? { mimeType } : {}),
        ...(typeof fileSize === 'number' ? { fileSize: Math.trunc(fileSize) } : {}),
      },
    ]
  })
}

export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // text + TS union rather than pgEnum: ALTER TYPE ... ADD VALUE can't run in
    // the same transaction that references it, so adding a kind later would be
    // a migration foot-gun.
    kind: text('kind').$type<BlockKind>().notNull().default('text'),
    heading: text('heading'),
    // kind='text' body; doubles as caption/alt for image and document, and as
    // the carousel's own caption beneath the per-slide ones.
    body: text('body'),
    // Blob URL for uploads; pasted URL for link and embed.
    url: text('url'),
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),
    // Kind-specific extras that don't earn a column. kind='carousel' keeps its
    // slides here as `images: CarouselImage[]`.
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('blocks_project_sort_idx').on(t.projectId, t.sortOrder, t.createdAt)],
)

/** Standalone copy that isn't a project: about text, contact details, links. */
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

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

// Required for db.query.projects.findMany({ with: { blocks: true } }) to compile.
export const projectsRelations = relations(projects, ({ many }) => ({
  blocks: many(blocks),
}))

export const blocksRelations = relations(blocks, ({ one }) => ({
  project: one(projects, {
    fields: [blocks.projectId],
    references: [projects.id],
  }),
}))

export type ProjectRow = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type BlockRow = typeof blocks.$inferSelect
export type NewBlock = typeof blocks.$inferInsert
