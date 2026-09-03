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

/** One block = one paragraph, image, document, link, or embed inside a project. */
export type BlockKind = 'text' | 'image' | 'document' | 'link' | 'embed'

export const BLOCK_KINDS: readonly BlockKind[] = [
  'text',
  'image',
  'document',
  'link',
  'embed',
]

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
    // kind='text' body; doubles as caption/alt for image and document.
    body: text('body'),
    // Blob URL for uploads; pasted URL for link and embed.
    url: text('url'),
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),
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

/** Standalone copy that isn't a project: about text, contact email, resume PDF. */
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
  // A link now, not an upload: the resume lives wherever it already lives
  // (Drive, a PDF host) and is swapped by pasting a new URL.
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
