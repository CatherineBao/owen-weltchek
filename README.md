# owen-weltchek

Personal site with a self-serve content editor. Content lives in Neon Postgres
and the public page reads it at runtime, so publishing never needs a rebuild.

- **Frontend** — React 19 + TypeScript + Vite, Tailwind v4, Framer Motion
- **API** — Vercel serverless functions in `api/`
- **Database** — Neon Postgres via Drizzle ORM
- **File storage** — Vercel Blob (images, PDFs)

## Layout

```
api/          Vercel functions. One file = one endpoint.
lib/          Server-only code: schema, db pool, auth, blob cleanup.
drizzle/      Generated migrations. Committed.
src/site/     Everything a visitor sees.
src/admin/    Everything behind the password, at /update.
```

`src/site/` must never import from `src/admin/` — the admin route is lazy-loaded
so the editor and its upload SDK stay out of the visitor's bundle.

## Content model

A **project** owns an ordered list of **blocks**. A block is one paragraph,
image, uploaded document, link, or embedded video. Deleting a project cascades
to its blocks and deletes their uploaded files.

Standalone copy (site title, about text, contact email, resume PDF) lives in
`site_settings` as key/value rows.

`published` is per project — a whole project is draft or live.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run db:migrate             # create the tables
```

The two Neon connection strings are **not** interchangeable:

| | Which one | Used by |
|---|---|---|
| Runtime | `DATABASE_URL` (pooled, `-pooler`) | `lib/db.ts` |
| Migrations | `DATABASE_URL_UNPOOLED` (direct) | `drizzle.config.ts` |

Running migrations over the pooled connection fails with errors that never
mention pooling. `drizzle.config.ts` guards against it.

## Development

`vite dev` alone cannot serve `api/` — Vite knows nothing about Vercel
functions, so every `/api/*` call 404s. Use `vercel dev`, which runs Vite
internally and adds function routing, on **port 3000**:

```bash
npx vercel login
npx vercel link
npx vercel env pull    # WARNING: overwrites .env.local wholesale
npx vercel dev
```

## Schema changes

```bash
npm run db:generate    # writes a .sql file to drizzle/
                       # review it, then:
npm run db:migrate
npm run db:studio      # browse and edit rows
```

There is deliberately no `db:push`. Generate, review the SQL, migrate, commit.
Migrations run from your machine, never from the Vercel build.

## Editing content

Go to `/update` and sign in with the admin password.

The password itself is never stored. `ADMIN_PASSWORD_HASH` holds a salted scrypt
digest of it; to change the password, run

```
npm run admin:hash -- '<new password>'
```

and replace the `ADMIN_PASSWORD_HASH=` line in `.env.local` (and the Vercel
environment variable) with what it prints.

That URL is unlisted, not protected — the API endpoints behind it are public
URLs anyone can find. The password and `SESSION_SECRET` are the actual security
boundary. Keep both long and random; rotating `SESSION_SECRET` signs out every
session. Hashing protects the password if the environment leaks, but it does
nothing against someone guessing a short password at the login endpoint.
