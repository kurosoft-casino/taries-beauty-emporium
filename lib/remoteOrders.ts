import { apiRequest } from './remoteApi'
import type { Order } from './orders'
import type { CartItem } from './store'
import type { Product } from './products'

interface RemoteOrderPayload {
  ok?: boolean
  order?: Record<string, unknown>
  items?: Record<string, unknown>[]
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

/** Map the API order payload (legacy D1-style strings) into the storefront Order shape. */
export function mapRemoteOrder(orderRow: Record<string, unknown>, items: Record<string, unknown>[]): Order {
  const customer = parseJsonObject(orderRow.customer_json)
  const shipping = parseJsonObject(orderRow.shipping_json)

  const mappedItems: CartItem[] = items.map(row => {
    const snapshot = parseJsonObject(row.product_snapshot_json)
    const product = {
      ...snapshot,
      id: String(snapshot.id ?? row.product_id ?? ''),
      slug: String(snapshot.slug ?? ''),
      name: String(snapshot.name ?? row.product_name ?? 'Item'),
      price: Number(snapshot.price ?? row.unit_price_usd ?? 0),
      images: Array.isArray(snapshot.images) ? (snapshot.images as string[]) : [],
    } as unknown as Product
    return {
      product,
      quantity: Number(row.quantity ?? 1),
      selectedVariants: parseJsonObject(row.selected_variants_json) as Record<string, string>,
    }
  })

  return {
    orderId: String(orderRow.order_id ?? ''),
    date: String(orderRow.date ?? orderRow.created_at ?? new Date().toISOString()),
    status: (orderRow.status as Order['status']) ?? 'pending',
    paymentStatus: (orderRow.payment_status as Order['paymentStatus']) ?? 'pending',
    paymentMethod: String(orderRow.payment_method ?? ''),
    currency: (orderRow.currency as Order['currency']) ?? 'USD',
    items: mappedItems,
    subtotalUSD: Number(orderRow.subtotal_usd ?? 0),
    shippingUSD: Number(orderRow.shipping_usd ?? 0),
    grandTotalUSD: Number(orderRow.grand_total_usd ?? 0),
    discountUSD: orderRow.discount_usd != null ? Number(orderRow.discount_usd) : undefined,
    couponCode: (orderRow.coupon_code as string | null) ?? undefined,
    customer: {
      firstName: String(customer.firstName ?? ''),
      lastName: String(customer.lastName ?? ''),
      email: String(customer.email ?? ''),
      phone: String(customer.phone ?? ''),
    },
    shipping: {
      address: String(shipping.address ?? ''),
      city: String(shipping.city ?? ''),
      state: String(shipping.state ?? ''),
      country: String(shipping.country ?? ''),
      postalCode: String(shipping.postalCode ?? ''),
    },
    notes: (orderRow.notes as string | null) ?? undefined,
    giftMessage: (orderRow.gift_message as string | null) ?? undefined,
  }
}

export type RemoteOrderResult =
  | { status: 'ok'; order: Order }
  | { status: 'not-found' }
  | { status: 'email-mismatch' }
  | { status: 'error' }

/** Look up an order from the API (optionally verifying the customer email). */
export async function fetchRemoteOrder(orderId: string, email?: string): Promise<RemoteOrderResult> {
  const query = email ? `?email=${encodeURIComponent(email)}` : ''
  const res = await apiRequest<RemoteOrderPayload>(`/orders/${encodeURIComponent(orderId)}${query}`)
  if (!res.ok) {
    if (res.status === 403) return { status: 'email-mismatch' }
    if (res.status === 404) return { status: 'not-found' }
    return { status: 'error' }
  }
  if (!res.data?.order) return { status: 'not-found' }
  return { status: 'ok', order: mapRemoteOrder(res.data.order, res.data.items ?? []) }
}
