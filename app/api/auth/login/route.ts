import { PB_COLLECTIONS, pbFirst, pbQuote, type PBRecord } from '@/lib/server/pocketbase'
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
    const row = await pbFirst<UserRow & PBRecord>(
      PB_COLLECTIONS.users,
      `email = ${pbQuote(email)}`,
    )

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
