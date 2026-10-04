import { PB_COLLECTIONS, pbList } from '@/lib/server/pocketbase'

export async function GET() {
  try {
    await pbList(PB_COLLECTIONS.users, { perPage: 1, fields: 'id' })
    return Response.json({ ok: true, services: { pocketbase: true } })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'PocketBase is not configured or unreachable.' },
      { status: 503 }
    )
  }
}
