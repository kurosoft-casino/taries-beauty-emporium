import { apiRequest } from './remoteApi'

export interface Review {
  id: string
  slug: string
  name: string
  location: string
  rating: number
  title: string
  body: string
  date: string
  verified: boolean
  helpfulCount: number
}

interface RemoteReviewRow {
  id: string
  product_slug: string
  user_id?: string | null
  user_name?: string | null
  rating: number
  title?: string | null
  body: string
  status?: string | null
  created_at: string
}

function mapRemoteReview(row: RemoteReviewRow): Review {
  return {
    id: row.id,
    slug: row.product_slug,
    name: row.user_name?.trim() || 'Customer',
    location: '',
    rating: Number(row.rating || 0),
    title: row.title ?? '',
    body: row.body ?? '',
    date: row.created_at,
    verified: Boolean(row.user_id),
    helpfulCount: 0,
  }
}

/** Load approved reviews for a product from the API. */
export async function fetchProductReviews(slug: string): Promise<Review[]> {
  const res = await apiRequest<{ reviews?: RemoteReviewRow[] }>(`/products/${encodeURIComponent(slug)}/reviews`)
  if (!res.ok || !Array.isArray(res.data?.reviews)) return []
  return res.data.reviews.map(mapRemoteReview)
}

export interface ReviewSubmission {
  rating: number
  title?: string
  body: string
}

export interface SubmitReviewResult {
  ok: boolean
  error?: string
  requiresAuth?: boolean
}

/** Submit a review for moderation. Requires a signed-in customer. */
export async function submitProductReview(slug: string, submission: ReviewSubmission): Promise<SubmitReviewResult> {
  const res = await apiRequest(`/products/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(submission),
  })
  if (res.ok) return { ok: true }
  if (res.status === 401) {
    return { ok: false, error: 'Please sign in to write a review.', requiresAuth: true }
  }
  return { ok: false, error: res.error ?? 'Could not submit your review right now.' }
}

export function getAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
}
