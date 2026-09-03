import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// Module scope already runs once per function instance; the globalThis guard
// covers double module evaluation (dev servers, ESM/CJS dual loads).
const g = globalThis as unknown as { __owPool?: Pool }

const pool =
  g.__owPool ??
  // No `ssl` option on purpose: node-postgres silently ignores it when the
  // connection string carries sslmode, which the Neon URL does.
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  })

if (!g.__owPool) {
  // Releases idle clients before the instance suspends. Without it, Fluid
  // compute suspends holding sockets open and leaks Neon connections.
  attachDatabasePool(pool)
  g.__owPool = pool
}

export const db = drizzle(pool, { schema })
export { pool, schema }
