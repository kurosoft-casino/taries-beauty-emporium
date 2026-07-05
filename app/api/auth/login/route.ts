import { requireDatabase } from '@/lib/server/cloudflare'
import { createRemoteSession, toRemoteUser, type UserRow, verifyRemotePassword } from '@/lib/server/sessionAuth'
import { isValidEmail, normalizeEmail } from '@/lib/validation'

interface LoginPayload {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as LoginPayload | null
  const email = normalizeEmail(body?.email ?? '')
  const password = body?.password ?? ''

  if (!isValidEmail(email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!password) return Response.json({ error: 'Password is required.' }, { status: 400 })

  try {
    const db = await requireDatabase()
    const row = await db.prepare(`
      SELECT id, first_name, last_name, email, phone, role, avatar, created_at, password_hash, password_salt, password_version, metadata_json
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `).bind(email).first<UserRow>()

    if (!row) return Response.json({ error: 'No account found with that email address.' }, { status: 404 })
    const valid = await verifyRemotePassword(row, password)
    if (!valid) return Response.json({ error: 'Incorrect password. Please try again.' }, { status: 401 })

    const user = toRemoteUser(row)
    const setCookie = await createRemoteSession(user.id, user.role === 'admin' ? 'admin' : 'customer', request)
    return Response.json({ ok: true, user }, { headers: { 'Set-Cookie': setCookie } })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Login service unavailable.' },
      { status: 503 },
    )
  }
}
