import { clearRemoteSession } from '@/lib/server/sessionAuth'

export async function POST(request: Request) {
  try {
    const clearCookie = await clearRemoteSession(request)
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearCookie } })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Logout service unavailable.' },
      { status: 503 },
    )
  }
}

