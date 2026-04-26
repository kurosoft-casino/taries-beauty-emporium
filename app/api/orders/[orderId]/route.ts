import { getRemoteOrder } from '@/lib/server/orders'
import { isValidEmail, normalizeEmail } from '@/lib/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  const { searchParams } = new URL(request.url)
  const email = normalizeEmail(searchParams.get('email') ?? '')

  if (!isValidEmail(email)) {
    return Response.json({ error: 'Please provide the email used at checkout.' }, { status: 400 })
  }

  try {
    const order = await getRemoteOrder(orderId, email)
    if (!order) {
      return Response.json({ error: 'Order not found.' }, { status: 404 })
    }
    return Response.json({ ok: true, order })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Order lookup is unavailable right now.' },
      { status: 503 }
    )
  }
}
