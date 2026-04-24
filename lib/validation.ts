export function sanitizeInlineText(value: string): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeMultilineText(value: string): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .trim()
}

export function normalizeEmail(value: string): string {
  return sanitizeInlineText(value).toLowerCase()
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value)
  if (!email || email.length > 254) return false
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(email)
}

export function sanitizePhone(value: string): string {
  return value
    .replace(/[^+\d\s()-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}
