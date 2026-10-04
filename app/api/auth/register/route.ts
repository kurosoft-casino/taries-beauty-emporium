import { PB_COLLECTIONS, pbCreate, pbFirst, pbQuote, type PBRecord } from '@/lib/server/pocketbase'
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
    const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.users, `email = ${pbQuote(email)}`)
    if (existing) return Response.json({ error: 'An account with this email already exists.' }, { status: 409 })

    const now = new Date().toISOString()
    const passwordData = await createRemotePassword(email, password)
    const role = email === 'tarimoboere18@gmail.com' ? 'admin' : 'customer'

    const created = await pbCreate<UserRow & PBRecord>(PB_COLLECTIONS.users, {
      role,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password_hash: passwordData.hash,
      password_salt: passwordData.salt,
      password_version: passwordData.version,
      avatar: sanitizeInlineText(body?.avatar ?? '') || null,
      created_at: now,
      updated_at: now,
      metadata_json: { country },
    })

    const user = toRemoteUser(created)
    const setCookie = await createRemoteSession(user.id, user.role === 'admin' ? 'admin' : 'customer', request)

    return Response.json({ ok: true, user }, { headers: { 'Set-Cookie': setCookie } })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Registration service unavailable.' },
      { status: 503 },
    )
  }
}
