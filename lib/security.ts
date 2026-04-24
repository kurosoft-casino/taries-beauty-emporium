function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function randomSalt(length = 16): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

export async function hashSecret(secret: string, salt: string): Promise<string> {
  const payload = new TextEncoder().encode(`${salt}::${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', payload)
  return toHex(digest)
}
