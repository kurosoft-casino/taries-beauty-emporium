import 'server-only'

import {
  PB_COLLECTIONS,
  pbCreate,
  pbDeleteWhere,
  pbFirst,
  pbListAll,
  pbQuote,
  pbUpdate,
  type PBRecord,
} from './pocketbase'

export interface PersistedOrderItem {
  productId: string
  productName: string
  unitPriceUSD: number
  quantity: number
  selectedVariants: Record<string, string>
  productSnapshot: Record<string, unknown>
}

export interface PersistedOrder {
  orderId: string
  userId?: string | null
  date: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
  paymentStatus: 'pending' | 'paid'
  paymentMethod: string
  currency: 'NGN' | 'GHS' | 'USD' | 'CNY'
  subtotalUSD: number
  shippingUSD: number
  grandTotalUSD: number
  discountUSD?: number
  couponCode?: string
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  shipping: {
    address: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  notes?: string
  giftMessage?: string
  items: PersistedOrderItem[]
}

interface OrderRecord extends PBRecord {
  order_id: string
  user_id: string | null
  date: string
  status: PersistedOrder['status']
  payment_status: PersistedOrder['paymentStatus']
  payment_method: string
  currency: PersistedOrder['currency']
  subtotal_usd: number
  shipping_usd: number
  grand_total_usd: number
  discount_usd: number | null
  coupon_code: string | null
  customer_json: PersistedOrder['customer']
  shipping_json: PersistedOrder['shipping']
  notes: string | null
  gift_message: string | null
}

interface OrderItemRecord extends PBRecord {
  order_id: string
  product_id: string
  product_name: string
  unit_price_usd: number
  quantity: number
  selected_variants_json: Record<string, string> | null
  product_snapshot_json: Record<string, unknown> | null
  position: number | null
}

export async function saveRemoteOrder(order: PersistedOrder): Promise<void> {
  const now = new Date().toISOString()
  const existing = await pbFirst<OrderRecord>(
    PB_COLLECTIONS.orders,
    `order_id = ${pbQuote(order.orderId)}`,
  )

  const payload = {
    order_id: order.orderId,
    user_id: order.userId ?? null,
    date: order.date,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    currency: order.currency,
    subtotal_usd: order.subtotalUSD,
    shipping_usd: order.shippingUSD,
    grand_total_usd: order.grandTotalUSD,
    discount_usd: order.discountUSD ?? 0,
    coupon_code: order.couponCode ?? null,
    customer_json: order.customer,
    shipping_json: order.shipping,
    notes: order.notes ?? null,
    gift_message: order.giftMessage ?? null,
    updated_at: now,
    ...(existing ? {} : { created_at: now }),
  }

  if (existing) {
    await pbUpdate(PB_COLLECTIONS.orders, existing.id, payload)
  } else {
    await pbCreate(PB_COLLECTIONS.orders, payload)
  }

  await pbDeleteWhere(PB_COLLECTIONS.orderItems, `order_id = ${pbQuote(order.orderId)}`)

  for (let index = 0; index < order.items.length; index += 1) {
    const item = order.items[index]
    await pbCreate(PB_COLLECTIONS.orderItems, {
      order_id: order.orderId,
      product_id: item.productId,
      product_name: item.productName,
      unit_price_usd: item.unitPriceUSD,
      quantity: item.quantity,
      selected_variants_json: item.selectedVariants,
      product_snapshot_json: item.productSnapshot,
      position: index + 1,
      created_at: now,
    })
  }
}

export async function getRemoteOrder(orderId: string, email?: string): Promise<PersistedOrder | null> {
  const record = await pbFirst<OrderRecord>(
    PB_COLLECTIONS.orders,
    `order_id = ${pbQuote(orderId)}`,
  )
  if (!record) return null

  if (email) {
    const recordEmail = String(record.customer_json?.email ?? '').toLowerCase()
    if (recordEmail !== email.toLowerCase()) return null
  }

  const items = await pbListAll<OrderItemRecord>(PB_COLLECTIONS.orderItems, {
    filter: `order_id = ${pbQuote(orderId)}`,
    sort: 'position,created_at',
  })

  return {
    orderId: record.order_id,
    userId: record.user_id ?? null,
    date: record.date,
    status: record.status,
    paymentStatus: record.payment_status,
    paymentMethod: record.payment_method,
    currency: record.currency,
    subtotalUSD: record.subtotal_usd,
    shippingUSD: record.shipping_usd,
    grandTotalUSD: record.grand_total_usd,
    discountUSD: record.discount_usd ?? undefined,
    couponCode: record.coupon_code ?? undefined,
    customer: record.customer_json,
    shipping: record.shipping_json,
    notes: record.notes ?? undefined,
    giftMessage: record.gift_message ?? undefined,
    items: items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      unitPriceUSD: item.unit_price_usd,
      quantity: item.quantity,
      selectedVariants: item.selected_variants_json ?? {},
      productSnapshot: item.product_snapshot_json ?? {},
    })),
  }
}
