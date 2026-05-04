import { requireDatabase } from '@/lib/server/cloudflare'
import { requireRemoteAdmin, toRemoteUser, type UserRow } from '@/lib/server/sessionAuth'

export async function GET(request: Request) {
  try {
    const admin = await requireRemoteAdmin(request)
    if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 })

    const db = requireDatabase()
    const rows = await db.prepare(`
      SELECT id, first_name, last_name, email, phone, role, avatar, created_at, password_hash, password_salt, password_version, metadata_json
      FROM users
      ORDER BY created_at DESC
      LIMIT 1000
    `).all<UserRow>()

    const users = (rows.results ?? []).map(row => toRemoteUser(row))
    return Response.json({ ok: true, users })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not read users right now.' },
      { status: 503 },
    )
  }
}
