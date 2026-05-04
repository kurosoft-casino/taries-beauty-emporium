import { getRemoteSessionUser } from '@/lib/server/sessionAuth'

export async function GET(request: Request) {
  try {
    const user = await getRemoteSessionUser(request)
    return Response.json({ ok: true, user })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Session lookup unavailable.' },
      { status: 503 },
    )
  }
}

