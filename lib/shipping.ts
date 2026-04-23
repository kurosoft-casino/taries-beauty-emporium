import type { CartItem } from './store'

export type CargoType = 'general' | 'sensitive'

export const RATES = {
  general:   { usdPerKg: 8.7,  ngnPerKg: 900 },
  sensitive: { usdPerKg: 10.9, ngnPerKg: 900 },
}
export const MIN_KG = 10
const NGN_EXCHANGE = 1620

export function estimateWeight(items: CartItem[]): number {
  const raw = items.reduce((sum, i) => sum + (i.product.weightKg ?? 0.35) * i.quantity, 0)
  return Math.max(raw, MIN_KG)
}

export function calcShipping(
  weightKg: number,
  cargo: CargoType,
): { usd: number; ngn: number; totalUsdEquiv: number } {
  const rate = RATES[cargo]
  const usd = parseFloat((rate.usdPerKg * weightKg).toFixed(2))
  const ngn = Math.round(rate.ngnPerKg * weightKg)
  const totalUsdEquiv = parseFloat((usd + ngn / NGN_EXCHANGE).toFixed(2))
  return { usd, ngn, totalUsdEquiv }
}

export function getCargoType(items: CartItem[]): CargoType {
  const sensitiveCategories = new Set(['beauty', 'maintenance'])
  const hasSensitive = items.some(i => sensitiveCategories.has(i.product.category))
  return hasSensitive ? 'sensitive' : 'general'
}
