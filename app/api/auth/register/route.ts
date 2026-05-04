import { requireDatabase } from '@/lib/server/cloudflare'
import { createRemotePassword, createRemoteSession, toRemoteUser, type UserRow } from '@/lib/server/sessionAuth'
import { isValidEmail, normalizeEmail, sanitizeInlineText, sanitizePhone } from '@/lib/validation'
import type { SupportedCountry } from '@/lib/phoneCountries'

interface RegisterPayload {
  firstName?: string
  lastName?: string
  email?: string
  country?: SupportedCountry
  phone?: string
  password?: string
  avatar?: string
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as RegisterPayload | null
  const firstName = sanitizeInlineText(body?.firstName ?? '')
  const lastName = sanitizeInlineText(body?.lastName ?? '')
  const email = normalizeEmail(body?.email ?? '')
  const country = body?.country
  const phone = sanitizePhone(body?.phone ?? '')
  const password = body?.password ?? ''

  if (!firstName) return Response.json({ error: 'First name is required.' }, { status: 400 })
  if (!lastName) return Response.json({ error: 'Last name is required.' }, { status: 400 })
  if (!isValidEmail(email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!country) return Response.json({ error: 'Country is required.' }, { status: 400 })
  if (!phone) return Response.json({ error: 'Phone number is required.' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })

  try {
    const db = requireDatabase()
    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1').bind(email).first<{ id: string }>()
    if (existing) return Response.json({ error: 'An account with this email already exists.' }, { status: 409 })

    const now = new Date().toISOString()
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const passwordData = await createRemotePassword(email, password)
    const role = email === 'kurosoft01@gmail.com' || email === 'tarimoboere18@gmail.com' ? 'admin' : 'customer'

    await db.prepare(`
      INSERT INTO users (
        id, role, first_name, last_name, email, phone, password_hash, password_salt, password_version,
        avatar, created_at, updated_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      role,
      firstName,
      lastName,
      email,
      phone,
      passwordData.hash,
      passwordData.salt,
      passwordData.version,
      sanitizeInlineText(body?.avatar ?? '') || null,
      now,
      now,
      JSON.stringify({ country }),
    ).run()

    const row = await db.prepare(`
      SELECT id, first_name, last_name, email, phone, role, avatar, created_at, password_hash, password_salt, password_version, metadata_json
      FROM users
      WHERE id = ?
      LIMIT 1
    `).bind(userId).first<UserRow>()

    if (!row) return Response.json({ error: 'Could not create account right now.' }, { status: 500 })
    const user = toRemoteUser(row)
    const setCookie = await createRemoteSession(user.id, user.role === 'admin' ? 'admin' : 'customer', request)

    return Response.json({ ok: true, user }, { headers: { 'Set-Cookie': setCookie } })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Registration service unavailable.' },
      { status: 503 },
    )
  }
}
