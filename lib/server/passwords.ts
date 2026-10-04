import 'server-only'

/**
 * Shared password hashing for all server-side auth entry points.
 * Current scheme: PBKDF2-SHA256 (version 3), matching the former Worker.
 * Legacy verification supports the earlier salted SHA-256 formats so
 * accounts created before the PocketBase migration keep working.
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return toHex(buf.buffer)
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return toHex(buf)
}

export async function pbkdf2Hash(password: string, salt: string, iter = 100_000): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: iter, hash: 'SHA-256' },
    key,
    256
  )
  return toHex(bits)
}

export interface StoredPassword {
  hash: string | null
  salt: string | null
  version: number | null
}

export async function createPassword(password: string): Promise<{ hash: string; salt: string; version: number }> {
  const salt = randomHex(16)
  const hash = await pbkdf2Hash(password, salt)
  return { hash, salt, version: 3 }
}

export async function verifyPassword(stored: StoredPassword, email: string, password: string): Promise<boolean> {
  if (!stored.hash) return false
  const salt = stored.salt || ''
  const version = Number(stored.version ?? 0)
  if (version === 3) {
    return (await pbkdf2Hash(password, salt)) === stored.hash
  }
  // Legacy formats (version 2 mixed the email into the secret).
  const legacyV2 = await sha256Hex(`${salt}::${email.toLowerCase()}::${password}`)
  if (legacyV2 === stored.hash) return true
  const legacyV1 = await sha256Hex(`${salt}::${password}`)
  if (legacyV1 === stored.hash) return true
  // Version unset: also try the current scheme defensively.
  if (!version) {
    return (await pbkdf2Hash(password, salt)) === stored.hash
  }
  return false
}
