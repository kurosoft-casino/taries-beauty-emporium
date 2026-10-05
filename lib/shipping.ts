import type { CartItem } from './store'
import { getAfricanCountry, type AfricaZone } from './africa'

export type CargoType = 'general' | 'sensitive'

export const RATES = {
  general:   { usdPerKg: 8.7,  ngnPerKg: 900 },
  sensitive: { usdPerKg: 10.9, ngnPerKg: 900 },
}
export const MIN_KG = 10
const NGN_EXCHANGE = 1620

/** Advertised offer: orders at/above this merchandise subtotal (USD) ship free (standard). */
export const FREE_SHIPPING_THRESHOLD_USD = 200

export function qualifiesForFreeShipping(subtotalUsd: number): boolean {
  return Number.isFinite(subtotalUsd) && subtotalUsd >= FREE_SHIPPING_THRESHOLD_USD
}

/** Countries on the legacy pricing blend (USD freight + NGN local clearing) — their totals are unchanged. */
const LEGACY_BLEND_COUNTRIES = new Set(['Nigeria', 'Ghana'])

/** Freight multiplier applied to the base USD/kg rate for each African zone (west keeps the legacy rate). */
const ZONE_FREIGHT_MULTIPLIERS: Record<AfricaZone, number> = {
  west: 1,
  central: 1.12,
  east: 1.12,
  north: 1.15,
  southern: 1.15,
}

/** Destination clearing/last-mile fee per shipment (USD) for countries outside the legacy blend. */
const ZONE_LOCAL_DELIVERY_USD: Record<AfricaZone, number> = {
  west: 14,
  central: 16,
  east: 16,
  north: 18,
  southern: 17,
}

const ZONE_DELIVERY_ESTIMATES: Record<AfricaZone, string> = {
  west: '7–14 business days',
  central: '10–18 business days',
  east: '10–18 business days',
  north: '10–16 business days',
  southern: '10–18 business days',
}

export interface ShippingQuote {
  /** International air freight component in USD. */
  usd: number
  /** Legacy NGN local clearing component (0 for non-legacy destinations). */
  ngn: number
  /** Destination clearing/last-mile fee in USD (0 for legacy destinations). */
  localUsd: number
  /** Total shipping cost expressed in USD equivalent. */
  totalUsdEquiv: number
  zone: AfricaZone
  country: string
  legacyBlend: boolean
}

export function estimateWeight(items: CartItem[]): number {
  const raw = items.reduce((sum, i) => sum + (i.product.weightKg ?? 0.35) * i.quantity, 0)
  return Math.max(raw, MIN_KG)
}

export function getShippingZone(country: string | null | undefined): AfricaZone {
  return getAfricanCountry(country)?.zone ?? 'west'
}

export function getDeliveryEstimate(country: string | null | undefined): string {
  return ZONE_DELIVERY_ESTIMATES[getShippingZone(country)]
}

export function calcShipping(
  weightKg: number,
  cargo: CargoType,
  country: string = 'Nigeria',
): ShippingQuote {
  const rate = RATES[cargo]
  const destination = (country || 'Nigeria').trim()
  const zone = getShippingZone(destination)
  const legacyBlend = LEGACY_BLEND_COUNTRIES.has(destination)

  if (legacyBlend) {
    const usd = parseFloat((rate.usdPerKg * weightKg).toFixed(2))
    const ngn = Math.round(rate.ngnPerKg * weightKg)
    const totalUsdEquiv = parseFloat((usd + ngn / NGN_EXCHANGE).toFixed(2))
    return { usd, ngn, localUsd: 0, totalUsdEquiv, zone, country: destination, legacyBlend }
  }

  const usd = parseFloat((rate.usdPerKg * ZONE_FREIGHT_MULTIPLIERS[zone] * weightKg).toFixed(2))
  const localUsd = ZONE_LOCAL_DELIVERY_USD[zone]
  const totalUsdEquiv = parseFloat((usd + localUsd).toFixed(2))
  return { usd, ngn: 0, localUsd, totalUsdEquiv, zone, country: destination, legacyBlend }
}

export function getCargoType(items: CartItem[]): CargoType {
  const sensitiveCategories = new Set(['beauty', 'maintenance', 'cleaning', 'electronics'])
  const hasSensitive = items.some(i => sensitiveCategories.has(i.product.category))
  return hasSensitive ? 'sensitive' : 'general'
}
