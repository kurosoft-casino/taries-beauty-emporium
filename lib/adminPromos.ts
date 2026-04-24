import type { Category } from './products'

export interface ManagedPromo {
  id: string
  code: string
  label: string
  discount: number
  categoryOnly?: Category[]
  audience: 'all' | 'new' | 'vip'
  active: boolean
  createdAt: string
  usageCount?: number
}

const PROMOS_KEY = 'taries-managed-promos'

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function getManagedPromos(): ManagedPromo[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(PROMOS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ManagedPromo[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveManagedPromos(promos: ManagedPromo[]): void {
  if (!canUseStorage()) return
  localStorage.setItem(PROMOS_KEY, JSON.stringify(promos))
}

export function upsertManagedPromo(promo: ManagedPromo): ManagedPromo[] {
  const promos = getManagedPromos()
  const next = promos.some(item => item.id === promo.id)
    ? promos.map(item => item.id === promo.id ? promo : item)
    : [promo, ...promos]
  saveManagedPromos(next)
  return next
}

export function removeManagedPromo(id: string): ManagedPromo[] {
  const next = getManagedPromos().filter(item => item.id !== id)
  saveManagedPromos(next)
  return next
}

export function getActiveManagedPromos(): ManagedPromo[] {
  return getManagedPromos().filter(promo => promo.active)
}
