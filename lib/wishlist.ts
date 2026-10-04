import { apiRequest } from './remoteApi'
import { getCurrentUser } from './auth'

const KEY = 'taries-wishlist'

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function writeWishlist(list: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

/** Guest-only toggle (local storage). Prefer toggleWishlistForUser. */
export function toggleWishlist(slug: string): boolean {
  const list = getWishlist()
  const idx = list.indexOf(slug)
  const updated = idx === -1 ? [...list, slug] : list.filter(s => s !== slug)
  writeWishlist(updated)
  return updated.includes(slug)
}

export function isWishlisted(slug: string): boolean {
  return getWishlist().includes(slug)
}

export function clearWishlist(): void {
  writeWishlist([])
}

/**
 * Load the wishlist for the current visitor: server-backed when signed in
 * (mirrored locally), local-only for guests. Guest items are merged into the
 * account on first load after signing in.
 */
export async function loadWishlist(): Promise<string[]> {
  const user = getCurrentUser()
  if (user) {
    const res = await apiRequest<{ items?: { slug: string }[] }>('/wishlist')
    if (res.ok && Array.isArray(res.data?.items)) {
      const serverSlugs = res.data.items.map(item => item.slug)
      const local = getWishlist()
      const missing = local.filter(slug => !serverSlugs.includes(slug))
      for (const slug of missing) {
        await apiRequest('/wishlist', { method: 'POST', body: JSON.stringify({ slug }) })
      }
      const merged = [...serverSlugs, ...missing]
      writeWishlist(merged)
      return merged
    }
  }
  return getWishlist()
}

/**
 * Toggle a wishlist item. Signed-in users sync to their account; guests keep
 * the local behaviour.
 */
export async function toggleWishlistForUser(slug: string): Promise<boolean> {
  const user = getCurrentUser()
  const currently = getWishlist().includes(slug)

  if (!user) return toggleWishlist(slug)

  const res = currently
    ? await apiRequest(`/wishlist/${encodeURIComponent(slug)}`, { method: 'DELETE' })
    : await apiRequest('/wishlist', { method: 'POST', body: JSON.stringify({ slug }) })

  if (!res.ok) return currently

  const updated = currently ? getWishlist().filter(s => s !== slug) : [...getWishlist(), slug]
  writeWishlist(updated)
  return updated.includes(slug)
}

/** Clear the wishlist (server + local for signed-in users). */
export async function clearWishlistForUser(): Promise<void> {
  const user = getCurrentUser()
  if (user) {
    const res = await apiRequest<{ items?: { slug: string }[] }>('/wishlist')
    if (res.ok && Array.isArray(res.data?.items)) {
      for (const item of res.data.items) {
        await apiRequest(`/wishlist/${encodeURIComponent(item.slug)}`, { method: 'DELETE' })
      }
    }
  }
  writeWishlist([])
}
