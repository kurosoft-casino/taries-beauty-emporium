import { requireDatabase } from '@/lib/server/cloudflare'
import { isValidEmail, normalizeEmail } from '@/lib/validation'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null
  const email = normalizeEmail(body?.email ?? '')

  if (!isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  try {
    const db = await requireDatabase()
    await db.prepare(`
      INSERT OR IGNORE INTO newsletter_subscribers (email, source, created_at)
      VALUES (?, 'footer', ?)
    `).bind(email, new Date().toISOString()).run()

    return Response.json({ ok: true, email })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Newsletter service is unavailable right now.' },
      { status: 503 }
    )
  }
}
