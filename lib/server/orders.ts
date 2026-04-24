import 'server-only'

import { requireDatabase } from './cloudflare'

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

interface OrderRow {
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
  customer_json: string
  shipping_json: string
  notes: string | null
  gift_message: string | null
}

interface OrderItemRow {
  product_id: string
  product_name: string
  unit_price_usd: number
  quantity: number
  selected_variants_json: string
  product_snapshot_json: string
}

export async function saveRemoteOrder(order: PersistedOrder): Promise<void> {
  const db = requireDatabase()
  const now = new Date().toISOString()

  const statements = [
    db.prepare(`
      INSERT OR REPLACE INTO orders (
        order_id, user_id, date, status, payment_status, payment_method, currency,
        subtotal_usd, shipping_usd, grand_total_usd, discount_usd, coupon_code,
        customer_json, shipping_json, notes, gift_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM orders WHERE order_id = ?), ?), ?)
    `).bind(
      order.orderId,
      order.userId ?? null,
      order.date,
      order.status,
      order.paymentStatus,
      order.paymentMethod,
      order.currency,
      order.subtotalUSD,
      order.shippingUSD,
      order.grandTotalUSD,
      order.discountUSD ?? 0,
      order.couponCode ?? null,
      JSON.stringify(order.customer),
      JSON.stringify(order.shipping),
      order.notes ?? null,
      order.giftMessage ?? null,
      order.orderId,
      now,
      now,
    ),
    db.prepare('DELETE FROM order_items WHERE order_id = ?').bind(order.orderId),
    ...order.items.map((item, index) =>
      db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, product_name, unit_price_usd, quantity,
          selected_variants_json, product_snapshot_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `${order.orderId}-${index + 1}`,
        order.orderId,
        item.productId,
        item.productName,
        item.unitPriceUSD,
        item.quantity,
        JSON.stringify(item.selectedVariants),
        JSON.stringify(item.productSnapshot),
        now,
      )
    ),
  ]

  await db.batch(statements)
}

export async function getRemoteOrder(orderId: string, email?: string): Promise<PersistedOrder | null> {
  const db = requireDatabase()
  const query = email
    ? `
        SELECT * FROM orders
        WHERE order_id = ? AND LOWER(json_extract(customer_json, '$.email')) = LOWER(?)
        LIMIT 1
      `
    : 'SELECT * FROM orders WHERE order_id = ? LIMIT 1'

  const row = await db.prepare(query).bind(...(email ? [orderId, email] : [orderId])).first<OrderRow>()
  if (!row) return null

  const itemsResult = await db.prepare(`
    SELECT product_id, product_name, unit_price_usd, quantity, selected_variants_json, product_snapshot_json
    FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
  `).bind(orderId).all<OrderItemRow>()

  return {
    orderId: row.order_id,
    userId: row.user_id,
    date: row.date,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    currency: row.currency,
    subtotalUSD: row.subtotal_usd,
    shippingUSD: row.shipping_usd,
    grandTotalUSD: row.grand_total_usd,
    discountUSD: row.discount_usd ?? undefined,
    couponCode: row.coupon_code ?? undefined,
    customer: JSON.parse(row.customer_json),
    shipping: JSON.parse(row.shipping_json),
    notes: row.notes ?? undefined,
    giftMessage: row.gift_message ?? undefined,
    items: (itemsResult.results ?? []).map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      unitPriceUSD: item.unit_price_usd,
      quantity: item.quantity,
      selectedVariants: JSON.parse(item.selected_variants_json || '{}'),
      productSnapshot: JSON.parse(item.product_snapshot_json),
    })),
  }
}
