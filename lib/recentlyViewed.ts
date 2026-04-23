const KEY = 'taries-recent'
const MAX = 8

export function addRecentlyViewed(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    const current = getRecentlyViewed()
    const deduped = [slug, ...current.filter(s => s !== slug)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(deduped))
  } catch {
    // ignore
  }
}

export function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
