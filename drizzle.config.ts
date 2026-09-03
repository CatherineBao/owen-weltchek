import { defineConfig } from 'drizzle-kit'

// Node built-in (>=20.12), so no dotenv dependency. Absent in CI, where the
// environment is already populated.
try {
  process.loadEnvFile('.env.local')
} catch {
  /* no .env.local; assume env is already injected */
}

const url = process.env.DATABASE_URL_UNPOOLED

if (!url) {
  throw new Error(
    'DATABASE_URL_UNPOOLED is required. Migrations must use the direct (non -pooler) ' +
      'Neon endpoint; running drizzle-kit through the pooled URL fails with errors ' +
      'that never mention pooling.',
  )
}

if (url.includes('-pooler')) {
  throw new Error(
    'DATABASE_URL_UNPOOLED points at the pooled endpoint. Use the direct host ' +
      '(the one without "-pooler") for migrations.',
  )
}

export default defineConfig({
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
