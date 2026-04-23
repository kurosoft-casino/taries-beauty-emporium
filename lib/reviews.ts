const KEY = 'taries-reviews'

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

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const SEED_REVIEWS: Review[] = [
  // brazilian-straight-hd-lace-front
  {
    id: 'seed-bsh-1',
    slug: 'brazilian-straight-hd-lace-front',
    name: 'Chidinma Okafor',
    location: 'Lagos, Nigeria',
    rating: 5,
    title: 'Absolutely love this wig! Worth every penny',
    body: 'I was a bit skeptical ordering online but this wig exceeded every expectation. The HD lace is truly invisible on my skin tone. Installation was easy and it looks so natural even my colleagues thought it was my real hair. Will definitely reorder in a different length!',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 14,
  },
  {
    id: 'seed-bsh-2',
    slug: 'brazilian-straight-hd-lace-front',
    name: 'Abena Mensah',
    location: 'Accra, Ghana',
    rating: 5,
    title: 'Silky smooth and very natural looking',
    body: 'Ordered the 22 inch 180% density and it arrived in perfect condition. The hair is silky smooth, no tangles at all. The HD lace is so thin it literally disappears on my skin. I have ordered from other vendors but Taries quality is on another level. Shipping was within the stated time.',
    date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 9,
  },

  // deep-wave-full-lace-wig
  {
    id: 'seed-dwf-1',
    slug: 'deep-wave-full-lace-wig',
    name: 'Ngozi Adeyemi',
    location: 'Abuja, Nigeria',
    rating: 5,
    title: 'The waves are gorgeous and so bouncy!',
    body: 'This is my second purchase from Taries and I am never going back to any other vendor. The deep waves are defined and so luscious. The full lace means I can style it in any direction — I wore it in a high bun for an event and everyone was asking me about it. Amazing quality.',
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 11,
  },
  {
    id: 'seed-dwf-2',
    slug: 'deep-wave-full-lace-wig',
    name: 'Ama Owusu',
    location: 'Kumasi, Ghana',
    rating: 4,
    title: 'Very good quality, slightly long delivery',
    body: 'The wig itself is stunning — the deep wave pattern is natural and the hair feels so soft. I gave 4 stars only because my delivery took a bit longer than expected, about 16 days. But once it arrived the quality made up for the wait. I spritzed it with water and the waves came alive beautifully.',
    date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 7,
  },

  // kinky-curly-5x5-closure-wig
  {
    id: 'seed-kcw-1',
    slug: 'kinky-curly-5x5-closure-wig',
    name: 'Kemi Fashola',
    location: 'Port Harcourt, Nigeria',
    rating: 5,
    title: 'Finally a kinky curly wig that looks natural!',
    body: 'I have been looking for a good kinky curly wig for years and this one is it. The 5x5 closure provides such a realistic scalp appearance. The curls are defined and springy. I co-washed it after a week and the curls refreshed beautifully. This is my new holy grail wig.',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 18,
  },
  {
    id: 'seed-kcw-2',
    slug: 'kinky-curly-5x5-closure-wig',
    name: 'Efua Asante',
    location: 'Takoradi, Ghana',
    rating: 4,
    title: 'Love the texture, would buy again',
    body: 'The curls on this wig are so realistic and voluminous. I was worried about it looking too shiny but it has a natural matte finish that blends with my own hair. The 5x5 closure is a good size for natural parting. Lost one star because the cap was slightly small but it stretched well over time.',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 5,
  },

  // body-wave-glueless-wig
  {
    id: 'seed-bwg-1',
    slug: 'body-wave-glueless-wig',
    name: 'Blessing Nwosu',
    location: 'Enugu, Nigeria',
    rating: 5,
    title: 'Perfect for beginners! So easy to put on',
    body: 'I am a complete wig beginner and this glueless wig is a game changer. I was so scared of lace glue and the whole process but this wig clips on perfectly with the elastic band and combs. The body wave is gorgeous and the hair feels luxurious. My sister ended up ordering one too!',
    date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 22,
  },
  {
    id: 'seed-bwg-2',
    slug: 'body-wave-glueless-wig',
    name: 'Akosua Boateng',
    location: 'Accra, Ghana',
    rating: 5,
    title: 'Great value for money, excellent quality',
    body: 'This wig is honestly incredible for the price. The body wave pattern is full and bouncy. Being glueless means my edges are protected and installation takes under 10 minutes. I have washed it twice already and it held its wave pattern beautifully. Highly recommend to everyone.',
    date: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 13,
  },

  // argan-oil-hair-growth-serum
  {
    id: 'seed-aoh-1',
    slug: 'argan-oil-hair-growth-serum',
    name: 'Ifeoma Chukwu',
    location: 'Onitsha, Nigeria',
    rating: 5,
    title: 'My edges are growing back after 3 weeks!',
    body: 'I have been struggling with thinning edges for over a year from wig glue damage. After using this serum consistently for 3 weeks I can see new baby hairs growing back. The serum soaks in quickly, no greasiness, and my scalp feels nourished. This product is genuinely effective.',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 31,
  },
  {
    id: 'seed-aoh-2',
    slug: 'argan-oil-hair-growth-serum',
    name: 'Adwoa Frimpong',
    location: 'Cape Coast, Ghana',
    rating: 4,
    title: 'Good product, pleasant scent',
    body: 'I have been using this serum for about a month and my hair feels stronger and shinier. The argan oil formula is lightweight and absorbs quickly without weighing down my hair. The scent is subtle and pleasant. I will continue using it to see more long-term results. Would recommend.',
    date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 8,
  },

  // luxury-belted-wool-coat
  {
    id: 'seed-lwc-1',
    slug: 'luxury-belted-wool-coat',
    name: 'Tolu Martins',
    location: 'Lagos, Nigeria',
    rating: 5,
    title: 'The most elegant coat I have ever owned',
    body: 'This coat is absolutely stunning in person. The photos do not do it justice. The wool fabric is thick and warm, the belt gives it such a flattering silhouette. I wore it to a corporate dinner and received so many compliments. The tailoring is precise and it fits true to size. Worth every kobo.',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 16,
  },
  {
    id: 'seed-lwc-2',
    slug: 'luxury-belted-wool-coat',
    name: 'Esi Quartey',
    location: 'Accra, Ghana',
    rating: 4,
    title: 'Beautiful coat, sizing runs slightly large',
    body: 'The quality of this wool coat is exceptional — the fabric is rich and the finishing is immaculate. I would suggest sizing down as it runs slightly large. I got a medium and it fits like a large on me. Despite that, the coat is gorgeous and very elegant. The belt detail elevates the entire look.',
    date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    verified: false,
    helpfulCount: 10,
  },
]

function getAllReviews(): Review[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function saveAllReviews(reviews: Review[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(reviews))
  } catch {
    // ignore
  }
}

export function seedReviewsIfEmpty(): void {
  if (typeof window === 'undefined') return
  try {
    const existing = localStorage.getItem(KEY)
    if (!existing || JSON.parse(existing).length === 0) {
      localStorage.setItem(KEY, JSON.stringify(SEED_REVIEWS))
    }
  } catch {
    // ignore
  }
}

export function getReviews(slug: string): Review[] {
  return getAllReviews().filter(r => r.slug === slug)
}

export function addReview(review: Omit<Review, 'id' | 'date' | 'helpfulCount'>): Review {
  const newReview: Review = {
    ...review,
    id: genId(),
    date: new Date().toISOString(),
    helpfulCount: 0,
  }
  const all = getAllReviews()
  all.unshift(newReview)
  saveAllReviews(all)
  return newReview
}

export function markHelpful(reviewId: string, slug: string): void {
  const helpfulKey = `taries-helpful-${reviewId}`
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(helpfulKey)) return
    const all = getAllReviews()
    const idx = all.findIndex(r => r.id === reviewId && r.slug === slug)
    if (idx !== -1) {
      all[idx] = { ...all[idx], helpfulCount: all[idx].helpfulCount + 1 }
      saveAllReviews(all)
      localStorage.setItem(helpfulKey, '1')
    }
  } catch {
    // ignore
  }
}

export function getAverageRating(slug: string): number {
  const reviews = getReviews(slug)
  if (reviews.length === 0) return 0
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
}

export function getReviewCount(slug: string): number {
  return getReviews(slug).length
}
