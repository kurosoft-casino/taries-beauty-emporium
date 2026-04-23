'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ThumbsUp, CheckCircle2, ChevronDown, PenLine, MessageSquare } from 'lucide-react'
import {
  getReviews, addReview, markHelpful, getAverageRating, getReviewCount, seedReviewsIfEmpty,
  type Review,
} from '@/lib/reviews'

type SortOption = 'newest' | 'highest' | 'helpful'

function StarSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={
              n <= (hovered || value)
                ? 'fill-brand-gold-2 text-brand-gold-2'
                : 'text-brand-gold/20'
            }
          />
        </button>
      ))}
    </div>
  )
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? 'fill-brand-gold-2 text-brand-gold-2' : 'text-brand-gold/20'}
        />
      ))}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface Props {
  slug: string
}

export default function ProductReviews({ slug }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [sort, setSort] = useState<SortOption>('newest')
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    name: '',
    location: '',
    rating: 0,
    title: '',
    body: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const loadReviews = useCallback(() => {
    setReviews(getReviews(slug))
  }, [slug])

  useEffect(() => {
    seedReviewsIfEmpty()
    loadReviews()
    try {
      const stored = localStorage.getItem('taries-helpful-clicked')
      if (stored) setHelpfulClicked(new Set(JSON.parse(stored)))
    } catch {}
  }, [loadReviews])

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sort === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime()
    if (sort === 'highest') return b.rating - a.rating
    return b.helpfulCount - a.helpfulCount
  })

  const avgRating = getAverageRating(slug)
  const count = getReviewCount(slug)

  const distrib = [5, 4, 3, 2, 1].map(star => {
    const n = reviews.filter(r => r.rating === star).length
    return { star, n, pct: count > 0 ? Math.round((n / count) * 100) : 0 }
  })

  function handleHelpful(reviewId: string) {
    if (helpfulClicked.has(reviewId)) return
    markHelpful(reviewId, slug)
    const updated = new Set(helpfulClicked).add(reviewId)
    setHelpfulClicked(updated)
    try {
      localStorage.setItem('taries-helpful-clicked', JSON.stringify([...updated]))
    } catch {}
    loadReviews()
  }

  function validateForm() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.rating === 0) errs.rating = 'Please select a star rating'
    if (!form.title.trim()) errs.title = 'Review title is required'
    if (form.body.trim().length < 20) errs.body = 'Review must be at least 20 characters'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    addReview({
      slug,
      name: form.name.trim(),
      location: form.location.trim() || 'Nigeria',
      rating: form.rating,
      title: form.title.trim(),
      body: form.body.trim(),
      verified: false,
    })
    loadReviews()
    setSubmitted(true)
    setForm({ name: '', location: '', rating: 0, title: '', body: '' })
    setFormErrors({})
    setTimeout(() => {
      setSubmitted(false)
      setShowForm(false)
    }, 3000)
  }

  return (
    <div className="space-y-8">
      {/* Rating summary */}
      {count > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-6 bg-brand-black-3 border border-brand-gold/20 rounded-xl">
          <div className="text-center shrink-0">
            <p className="font-display text-6xl font-bold gold-text leading-none">{avgRating.toFixed(1)}</p>
            <div className="flex justify-center my-2">
              <StarRow rating={avgRating} size={16} />
            </div>
            <p className="font-body text-xs text-brand-cream/40">{count} review{count !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 w-full space-y-2">
            {distrib.map(d => (
              <div key={d.star} className="flex items-center gap-3">
                <span className="font-body text-xs text-brand-cream/50 w-3 text-right">{d.star}</span>
                <Star size={10} className="fill-brand-gold-2 text-brand-gold-2 shrink-0" />
                <div className="flex-1 h-2 bg-brand-black rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: (5 - d.star) * 0.05 }}
                    className="h-full bg-gold-gradient rounded-full"
                  />
                </div>
                <span className="font-body text-xs text-brand-cream/40 w-8">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Sort dropdown */}
        {count > 0 && (
          <div className="relative flex items-center gap-2">
            <span className="font-body text-xs text-brand-cream/40 uppercase tracking-wider">Sort:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortOption)}
                className="appearance-none bg-brand-black-2 border border-brand-gold/20 text-brand-cream/70 text-xs font-body px-3 py-1.5 pr-7 rounded cursor-pointer focus:outline-none focus:border-brand-gold/50"
              >
                <option value="newest">Newest</option>
                <option value="highest">Highest Rated</option>
                <option value="helpful">Most Helpful</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-gold/50 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Write a review button */}
        <motion.button
          onClick={() => setShowForm(!showForm)}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 btn-outline-gold !px-4 !py-2 !text-xs"
        >
          <PenLine size={13} />
          {showForm ? 'Hide Form' : 'Write a Review'}
        </motion.button>
      </div>

      {/* Review form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border border-brand-gold/30 bg-brand-black-2 rounded-xl p-6">
              <h3 className="font-heading text-brand-cream font-semibold mb-5 flex items-center gap-2">
                <MessageSquare size={16} className="text-brand-gold-2" />
                Share Your Experience
              </h3>

              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl mb-4"
                  >
                    <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                    <p className="font-body text-sm text-green-400">Thank you! Your review has been posted.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs uppercase tracking-wider text-brand-cream/50 block mb-1.5">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={e => { setForm(f => ({ ...f, name: e.target.value })); delete formErrors.name; setFormErrors({ ...formErrors }) }}
                      placeholder="e.g. Chidinma O."
                      className={`w-full bg-brand-black-3 border rounded-lg px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors ${formErrors.name ? 'border-red-500' : 'border-brand-gold/20 focus:border-brand-gold/50'}`}
                    />
                    {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="font-body text-xs uppercase tracking-wider text-brand-cream/50 block mb-1.5">
                      Location
                    </label>
                    <input
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Lagos, Nigeria"
                      className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-gold/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-body text-xs uppercase tracking-wider text-brand-cream/50 block mb-2">
                    Rating <span className="text-red-400">*</span>
                  </label>
                  <StarSelector value={form.rating} onChange={v => { setForm(f => ({ ...f, rating: v })); delete formErrors.rating; setFormErrors({ ...formErrors }) }} />
                  {formErrors.rating && <p className="text-red-400 text-xs mt-1">{formErrors.rating}</p>}
                </div>

                <div>
                  <label className="font-body text-xs uppercase tracking-wider text-brand-cream/50 block mb-1.5">
                    Review Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); delete formErrors.title; setFormErrors({ ...formErrors }) }}
                    placeholder="Summarise your experience"
                    className={`w-full bg-brand-black-3 border rounded-lg px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors ${formErrors.title ? 'border-red-500' : 'border-brand-gold/20 focus:border-brand-gold/50'}`}
                  />
                  {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                </div>

                <div>
                  <label className="font-body text-xs uppercase tracking-wider text-brand-cream/50 block mb-1.5">
                    Your Review <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.body}
                    onChange={e => { setForm(f => ({ ...f, body: e.target.value })); delete formErrors.body; setFormErrors({ ...formErrors }) }}
                    rows={4}
                    placeholder="Tell others about your experience with this product (min. 20 characters)"
                    className={`w-full bg-brand-black-3 border rounded-lg px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors resize-none ${formErrors.body ? 'border-red-500' : 'border-brand-gold/20 focus:border-brand-gold/50'}`}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {formErrors.body
                      ? <p className="text-red-400 text-xs">{formErrors.body}</p>
                      : <span />
                    }
                    <span className={`text-xs font-body ${form.body.length < 20 ? 'text-brand-cream/30' : 'text-green-400'}`}>
                      {form.body.length}/20 min
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 border border-brand-gold/20 rounded-lg text-brand-cream/50 text-sm hover:border-brand-gold/40 hover:text-brand-cream/70 transition-all font-body"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 btn-gold !py-2.5"
                  >
                    Submit Review
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews list */}
      {sortedReviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16 text-center"
        >
          <MessageSquare size={40} className="text-brand-gold/20 mx-auto mb-4" />
          <h3 className="font-heading text-lg text-brand-cream mb-2">No reviews yet</h3>
          <p className="font-body text-sm text-brand-cream/40 mb-6">Be the first to review this product!</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-gold"
          >
            Write the First Review
          </button>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {sortedReviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="p-5 bg-brand-black-2 border border-brand-gold/10 rounded-xl hover:border-brand-gold/25 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold text-xs font-bold shrink-0">
                    {review.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold text-brand-cream leading-none">{review.name}</p>
                    <p className="font-body text-xs text-brand-cream/40 mt-0.5">{review.location}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StarRow rating={review.rating} size={13} />
                  <p className="font-body text-[10px] text-brand-cream/30">{formatDate(review.date)}</p>
                </div>
              </div>

              <p className="font-heading text-sm font-semibold text-brand-cream mb-1">{review.title}</p>
              <p className="font-body text-sm text-brand-cream/60 leading-relaxed mb-4">{review.body}</p>

              <div className="flex items-center gap-3 flex-wrap">
                {review.verified && (
                  <span className="flex items-center gap-1 text-[10px] font-body font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} />
                    Verified Purchase
                  </span>
                )}
                <motion.button
                  onClick={() => handleHelpful(review.id)}
                  whileTap={{ scale: 0.95 }}
                  disabled={helpfulClicked.has(review.id)}
                  className={`flex items-center gap-1.5 text-xs font-body px-3 py-1 rounded-full border transition-all duration-200 ${
                    helpfulClicked.has(review.id)
                      ? 'border-brand-gold/50 text-brand-gold bg-brand-gold/10 cursor-default'
                      : 'border-brand-gold/20 text-brand-cream/40 hover:border-brand-gold/40 hover:text-brand-gold'
                  }`}
                >
                  <ThumbsUp size={11} />
                  Helpful ({review.helpfulCount})
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
