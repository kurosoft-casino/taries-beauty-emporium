const KEY = 'taries-wishlist'

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function toggleWishlist(slug: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const list = getWishlist()
    const idx = list.indexOf(slug)
    let updated: string[]
    if (idx === -1) {
      updated = [...list, slug]
    } else {
      updated = list.filter(s => s !== slug)
    }
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated.includes(slug)
  } catch {
    return false
  }
}

export function isWishlisted(slug: string): boolean {
  return getWishlist().includes(slug)
}

export function clearWishlist(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, '[]')
  } catch {
    // ignore
  }
}
