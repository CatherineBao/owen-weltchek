// Prints an ADMIN_PASSWORD_HASH value for the password given as argv[2], or
// read from stdin when omitted so it stays out of the shell history.
//
//   npm run admin:hash -- 'my password'
//   echo -n 'my password' | npm run admin:hash

import { randomBytes, scryptSync } from 'node:crypto'

const N = 16384
const r = 8
const p = 1
const KEYLEN = 32

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')
}

const password = process.argv[2] ?? (process.stdin.isTTY ? '' : await readStdin())

if (!password) {
  console.error('usage: npm run admin:hash -- <password>   (or pipe it on stdin)')
  process.exit(1)
}

const salt = randomBytes(16)
const key = scryptSync(password, salt, KEYLEN, { N, r, p })

console.log(
  `ADMIN_PASSWORD_HASH=scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${key.toString('base64url')}`,
)
