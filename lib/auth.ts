import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'ow_session'
const MAX_AGE_SECONDS = 60 * 60 * 12 // 12 hours

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters')
  }
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

// Secure is set even locally: browsers treat http://localhost as a trustworthy
// origin and accept it. SameSite=Strict removes CSRF without a token scheme,
// since every request to these routes is same-origin.
const COOKIE_FLAGS = 'HttpOnly; Secure; SameSite=Strict; Path=/'

export function createSessionCookie(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000, jti: randomUUID() }),
  ).toString('base64url')
  return `${COOKIE_NAME}=${payload}.${sign(payload)}; ${COOKIE_FLAGS}; Max-Age=${MAX_AGE_SECONDS}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; ${COOKIE_FLAGS}; Max-Age=0`
}

export function isAuthed(request: Request): boolean {
  const raw = readCookie(request, COOKIE_NAME)
  if (!raw) return false

  const dot = raw.lastIndexOf('.')
  if (dot < 1) return false

  const payload = raw.slice(0, dot)
  const provided = Buffer.from(raw.slice(dot + 1))
  const expected = Buffer.from(sign(payload))

  // Length check first: timingSafeEqual throws on unequal-length buffers.
  if (provided.length !== expected.length) return false
  if (!timingSafeEqual(provided, expected)) return false

  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof claims !== 'object' || claims === null) return false
    const { exp } = claims as { exp?: unknown }
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

/**
 * Verifies against ADMIN_PASSWORD_HASH, which holds a scrypt digest rather than
 * the password itself, in the format:
 *
 *   scrypt$<N>$<r>$<p>$<salt base64url>$<key base64url>
 *
 * Generate one with `npm run admin:hash`. scrypt is deliberately slow and
 * memory-hard, so a leaked env file does not hand over the password. It does
 * not help against online guessing — that is what the login delay is for.
 */
export function checkPassword(input: unknown): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH
  if (!stored || typeof input !== 'string') return false

  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts
  const N = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false

  const salt = Buffer.from(rawSalt, 'base64url')
  const expected = Buffer.from(rawKey, 'base64url')
  if (salt.length === 0 || expected.length === 0) return false

  try {
    // maxmem must clear scrypt's 128 * N * r working set; the default 32 MB is
    // already too small at N=32768, r=8.
    const derived = scryptSync(input, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 256 * N * r + 1024 * 1024,
    })
    return timingSafeEqual(derived, expected)
  } catch {
    // Malformed parameters (N not a power of two, absurd cost) throw rather
    // than returning a wrong answer. Treat that as a failed login.
    return false
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim())
    }
  }
  return null
}
