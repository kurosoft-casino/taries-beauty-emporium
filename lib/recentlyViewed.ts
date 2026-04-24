const KEY = 'taries-recent'
const LEGACY_KEY = 'taries-recently-viewed'
const MAX = 8

export function addRecentlyViewed(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    const current = getRecentlyViewed()
    const deduped = [slug, ...current.filter(s => s !== slug)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(deduped))
    localStorage.setItem(LEGACY_KEY, JSON.stringify(deduped))
  } catch (error) {
    console.error('Failed to save recently viewed products', error)
  }
}

export function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || '[]'
    const items = JSON.parse(raw) as string[]
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, JSON.stringify(items))
    }
    return items
  } catch (error) {
    console.error('Failed to read recently viewed products', error)
    return []
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch (error) {
    console.error('Failed to clear recently viewed products', error)
  }
}
