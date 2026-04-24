import { requireDatabase } from '@/lib/server/cloudflare'

export async function GET() {
  try {
    const db = requireDatabase()
    await db.prepare('SELECT 1 as ok').first<{ ok: number }>()
    return Response.json({ ok: true, services: { d1: true } })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Cloudflare services are not configured.' },
      { status: 503 }
    )
  }
}
