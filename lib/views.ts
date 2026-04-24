// Product view tracking — stored in localStorage, visible to admin and vendors only
const KEY = 'taries-views'

export function getViews(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch (error) {
    console.error('Failed to read product views', error)
    return {}
  }
}

export function incrementView(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    const views = getViews()
    views[slug] = (views[slug] ?? 0) + 1
    localStorage.setItem(KEY, JSON.stringify(views))
  } catch (error) {
    console.error(`Failed to track view for ${slug}`, error)
  }
}

export function getViewCount(slug: string): number {
  return getViews()[slug] ?? 0
}

export function getAllViewsSorted(): Array<{ slug: string; views: number }> {
  const views = getViews()
  return Object.entries(views)
    .map(([slug, views]) => ({ slug, views }))
    .sort((a, b) => b.views - a.views)
}
