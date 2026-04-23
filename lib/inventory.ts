export interface InventoryItem {
  inStock: boolean
  notes: string
}

export type Inventory = Record<string, InventoryItem>

const STORAGE_KEY = 'taries-inventory'

export function getInventory(): Inventory {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setInventoryItem(slug: string, item: InventoryItem): void {
  if (typeof window === 'undefined') return
  try {
    const inv = getInventory()
    inv[slug] = item
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inv))
  } catch {
    // localStorage unavailable
  }
}
