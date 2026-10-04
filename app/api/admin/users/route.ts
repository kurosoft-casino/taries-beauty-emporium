import { PB_COLLECTIONS, pbList, type PBRecord } from '@/lib/server/pocketbase'
import { requireRemoteAdmin, toRemoteUser, type UserRow } from '@/lib/server/sessionAuth'

export async function GET(request: Request) {
  try {
    const admin = await requireRemoteAdmin(request)
    if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 })

    const result = await pbList<UserRow & PBRecord>(PB_COLLECTIONS.users, {
      sort: '-created_at',
      perPage: 1000,
    })

    const users = result.items.map(row => toRemoteUser(row))
    return Response.json({ ok: true, users })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not read users right now.' },
      { status: 503 },
    )
  }
}
