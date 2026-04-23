import type { CartItem, Currency } from './store'

export interface Order {
  orderId: string
  date: string         // ISO string
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
  paymentStatus: 'pending' | 'paid'
  paymentMethod: string
  currency: Currency
  items: CartItem[]
  subtotalUSD: number
  shippingUSD: number
  grandTotalUSD: number
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
}

export function saveOrder(order: Order): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getAllOrders()
    existing.unshift(order)
    localStorage.setItem('taries-orders', JSON.stringify(existing))
    localStorage.setItem('taries-last-order-id', order.orderId)
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function getOrder(orderId: string): Order | null {
  if (typeof window === 'undefined') return null
  try {
    const orders = getAllOrders()
    return orders.find(o => o.orderId === orderId) ?? null
  } catch {
    return null
  }
}

export function getAllOrders(): Order[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('taries-orders')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function updateOrderStatus(orderId: string, status: Order['status']): void {
  if (typeof window === 'undefined') return
  try {
    const orders = getAllOrders()
    const updated = orders.map(o => o.orderId === orderId ? { ...o, status } : o)
    localStorage.setItem('taries-orders', JSON.stringify(updated))
  } catch {
    // localStorage unavailable
  }
}

export function getLastOrderId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('taries-last-order-id')
}

export function formatOrderDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    card: 'Credit / Debit Card (Paystack)',
    transfer: 'Bank Transfer',
    mobile: 'Mobile Money',
  }
  return labels[method] ?? method
}
