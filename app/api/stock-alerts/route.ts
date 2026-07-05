import { requireDatabase } from '@/lib/server/cloudflare'
import { isValidEmail, normalizeEmail } from '@/lib/validation'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { slug?: string; email?: string } | null
  const slug = String(body?.slug ?? '').trim()
  const email = normalizeEmail(body?.email ?? '')

  if (!slug) {
    return Response.json({ error: 'Product slug is required.' }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  try {
    const db = await requireDatabase()
    await db.prepare(`
      INSERT OR IGNORE INTO stock_alert_requests (id, slug, email, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      `stock-alert-${slug}-${email}`,
      slug,
      email,
      new Date().toISOString(),
    ).run()

    return Response.json({ ok: true, slug, email })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Stock alert service is unavailable right now.' },
      { status: 503 }
    )
  }
}
