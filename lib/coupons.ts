import type { CartItem } from './store'
import { getActiveManagedPromos, getManagedPromos } from './adminPromos'

export interface Coupon {
  code: string
  discount: number
  label: string
  categoryOnly?: string[]
}

export const COUPONS: Record<string, Coupon> = {
  BEAUTY10: { code: 'BEAUTY10', discount: 0.10, label: '10% off' },
  WELCOME15: { code: 'WELCOME15', discount: 0.15, label: '15% off' },
  HAIR20: { code: 'HAIR20', discount: 0.20, label: '20% off on wigs & bundles', categoryOnly: ['wigs', 'bundles'] },
  TARIES10: { code: 'TARIES10', discount: 0.10, label: '10% off first order' },
  TARIES25: { code: 'TARIES25', discount: 0.25, label: '25% off (VIP)' },
}

const KEY = 'taries-applied-coupon'

export function getAllCoupons(): Record<string, Coupon> {
  const managed = Object.fromEntries(
    getActiveManagedPromos().map(promo => [
      promo.code.trim().toUpperCase(),
      {
        code: promo.code.trim().toUpperCase(),
        discount: promo.discount,
        label: promo.label,
        categoryOnly: promo.categoryOnly,
      } satisfies Coupon,
    ]),
  )

  return {
    ...COUPONS,
    ...managed,
  }
}

export function getAdminCouponList(): Coupon[] {
  const builtIn = Object.values(COUPONS)
  const managed = getManagedPromos().map(promo => ({
    code: promo.code.trim().toUpperCase(),
    discount: promo.discount,
    label: promo.label,
    categoryOnly: promo.categoryOnly,
  }))
  return [...builtIn, ...managed]
}

export function getCoupon(code: string): Coupon | null {
  return getAllCoupons()[code.trim().toUpperCase()] ?? null
}

export function calculateCouponDiscount(items: CartItem[], coupon: Coupon | null): number {
  if (!coupon) return 0
  if (!coupon.categoryOnly) {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * coupon.discount
  }
  const eligible = items.reduce((sum, item) => {
    if (coupon.categoryOnly?.includes(item.product.category)) {
      return sum + item.product.price * item.quantity
    }
    return sum
  }, 0)
  return eligible * coupon.discount
}

export function getAppliedCouponCode(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(KEY) ?? ''
}

export function getAppliedCoupon(): Coupon | null {
  return getCoupon(getAppliedCouponCode())
}

export function setAppliedCoupon(code: string): Coupon | null {
  if (typeof window === 'undefined') return null
  const coupon = getCoupon(code)
  if (!coupon) {
    localStorage.removeItem(KEY)
    return null
  }
  localStorage.setItem(KEY, coupon.code)
  return coupon
}

export function clearAppliedCoupon(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
