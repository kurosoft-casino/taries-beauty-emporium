import { getCoupon } from '@/lib/coupons'
import { calcShipping, MIN_KG, type CargoType } from '@/lib/shipping'
import { saveRemoteOrder, type PersistedOrder, type PersistedOrderItem } from '@/lib/server/orders'
import { isValidEmail, normalizeEmail, sanitizeInlineText, sanitizeMultilineText, sanitizePhone } from '@/lib/validation'

type CheckoutItem = {
  product?: {
    id?: string
    name?: string
    price?: number
    images?: string[]
    category?: string
    [key: string]: unknown
  }
  quantity?: number
  selectedVariants?: Record<string, string>
}

type CheckoutPayload = {
  orderId?: string
  currency?: PersistedOrder['currency']
  items?: CheckoutItem[]
  paymentMethod?: string
  couponCode?: string
  customer?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  shipping?: {
    address?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
  notes?: string
  giftMessage?: string
}

function roundCurrency(value: number): number {
  return parseFloat(value.toFixed(2))
}

function normalizeItems(items: CheckoutItem[] | undefined): PersistedOrderItem[] {
  if (!Array.isArray(items)) return []

  return items.flatMap(item => {
    const product = item.product
    const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 0)))
    const price = Number(product?.price ?? NaN)
    const productId = String(product?.id ?? '').trim()
    const productName = sanitizeInlineText(String(product?.name ?? ''))

    if (!productId || !productName || !Number.isFinite(price) || price < 0 || quantity < 1) {
      return []
    }

    return [{
      productId,
      productName,
      unitPriceUSD: roundCurrency(price),
      quantity,
      selectedVariants: item.selectedVariants ?? {},
      productSnapshot: {
        ...(product ?? {}),
        id: productId,
        name: productName,
        price: roundCurrency(price),
      },
    }]
  })
}

function estimateOrderWeight(items: PersistedOrderItem[]): number {
  const rawWeight = items.reduce((sum, item) => {
    const weightKg = Number(item.productSnapshot.weightKg ?? 0.35)
    return sum + (Number.isFinite(weightKg) ? weightKg : 0.35) * item.quantity
  }, 0)

  return Math.max(rawWeight, MIN_KG)
}

function getOrderCargoType(items: PersistedOrderItem[]): CargoType {
  const sensitiveCategories = new Set(['beauty', 'maintenance'])
  return items.some(item => sensitiveCategories.has(String(item.productSnapshot.category ?? '')))
    ? 'sensitive'
    : 'general'
}

function calculateOrderDiscount(items: PersistedOrderItem[], couponCode?: string): number {
  const coupon = couponCode ? getCoupon(couponCode) : null
  if (!coupon) return 0

  return roundCurrency(items.reduce((sum, item) => {
    const category = String(item.productSnapshot.category ?? '')
    const eligible = !coupon.categoryOnly || coupon.categoryOnly.includes(category)
    return eligible ? sum + item.unitPriceUSD * item.quantity * coupon.discount : sum
  }, 0))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as CheckoutPayload | null
  const items = normalizeItems(body?.items)

  if (items.length === 0) {
    return Response.json({ error: 'Your order does not contain any valid items.' }, { status: 400 })
  }

  const firstName = sanitizeInlineText(body?.customer?.firstName ?? '')
  const lastName = sanitizeInlineText(body?.customer?.lastName ?? '')
  const email = normalizeEmail(body?.customer?.email ?? '')
  const phone = sanitizePhone(body?.customer?.phone ?? '')
  const address = sanitizeInlineText(body?.shipping?.address ?? '')
  const city = sanitizeInlineText(body?.shipping?.city ?? '')
  const state = sanitizeInlineText(body?.shipping?.state ?? '')
  const country = sanitizeInlineText(body?.shipping?.country ?? '')
  const postalCode = sanitizeInlineText(body?.shipping?.postalCode ?? '')

  if (!firstName || !lastName || !address || !city || !state || !country || !phone || !isValidEmail(email)) {
    return Response.json({ error: 'Please complete all required customer and shipping fields.' }, { status: 400 })
  }

  const subtotalUSD = roundCurrency(items.reduce((sum, item) => sum + item.unitPriceUSD * item.quantity, 0))
  const coupon = body?.couponCode ? getCoupon(body.couponCode) : null
  const discountUSD = calculateOrderDiscount(items, coupon?.code)
  const shippingCalc = calcShipping(estimateOrderWeight(items), getOrderCargoType(items))
  const shippingUSD = roundCurrency(shippingCalc.totalUsdEquiv)
  const grandTotalUSD = roundCurrency(subtotalUSD - discountUSD + shippingUSD)

  const order: PersistedOrder = {
    orderId: String(body?.orderId ?? '').trim() || `TBE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    date: new Date().toISOString(),
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: sanitizeInlineText(body?.paymentMethod ?? 'card') || 'card',
    currency: body?.currency === 'GHS' || body?.currency === 'USD' || body?.currency === 'CNY' ? body.currency : 'NGN',
    subtotalUSD,
    shippingUSD,
    grandTotalUSD,
    discountUSD: discountUSD || undefined,
    couponCode: coupon?.code,
    customer: { firstName, lastName, email, phone },
    shipping: { address, city, state, country, postalCode },
    notes: sanitizeMultilineText(body?.notes ?? '') || undefined,
    giftMessage: sanitizeMultilineText(body?.giftMessage ?? '') || undefined,
    items,
  }

  try {
    await saveRemoteOrder(order)
    return Response.json({ ok: true, orderId: order.orderId })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Order service is unavailable right now.' },
      { status: 503 }
    )
  }
}
