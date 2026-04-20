'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Grid, List, X, Search, ChevronDown } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import { products, categories, type Category } from '@/lib/products'

const sortOptions = [
  { label: 'Featured',     value: 'featured' },
  { label: 'Newest',       value: 'new' },
  { label: 'Price: Low',   value: 'price-asc' },
  { label: 'Price: High',  value: 'price-desc' },
  { label: 'Best Rated',   value: 'rating' },
  { label: 'Most Reviews', value: 'reviews' },
]

function ShopContent() {
  const searchParams = useSearchParams()
  const [activeCategory, setActiveCategory] = useState<string>(searchParams.get('category') || 'all')
  const [sort,           setSort]           = useState('featured')
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [searchQuery,    setSearchQuery]    = useState(searchParams.get('search') || '')
  const [priceRange,     setPriceRange]     = useState([0, 500])
  const [badgeFilter,    setBadgeFilter]    = useState(searchParams.get('badge') || '')

  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) setActiveCategory(cat)
    const q = searchParams.get('search')
    if (q) setSearchQuery(q)
    const b = searchParams.get('badge')
    if (b) setBadgeFilter(b)
  }, [searchParams])

  const filtered = useMemo(() => {
    let list = [...products]
    if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q))
      )
    }
    if (badgeFilter) list = list.filter(p => p.badge === badgeFilter)
    list = list.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
    switch (sort) {
      case 'new':        return list.filter(p => p.badge === 'new').concat(list.filter(p => p.badge !== 'new'))
      case 'price-asc':  return list.sort((a, b) => a.price - b.price)
      case 'price-desc': return list.sort((a, b) => b.price - a.price)
      case 'rating':     return list.sort((a, b) => b.rating - a.rating)
      case 'reviews':    return list.sort((a, b) => b.reviews - a.reviews)
      default:           return list
    }
  }, [activeCategory, sort, searchQuery, badgeFilter, priceRange])

  return (
    <div className="min-h-screen bg-brand-black pt-32 pb-20">
      {/* Page header */}
      <div className="relative overflow-hidden bg-brand-black-2 border-b border-brand-gold/20 mb-8">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-label">
            ✦ Explore Everything ✦
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl md:text-5xl font-bold text-brand-cream">
            Our <span className="gold-text">Collection</span>
          </motion.h1>
          <p className="font-body text-brand-cream/50 mt-2">
            {filtered.length} products found
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-5 py-2 font-body text-sm font-semibold tracking-wider uppercase transition-all duration-200 ${
              activeCategory === 'all' ? 'bg-gold-gradient text-brand-black' : 'border border-brand-gold/30 text-brand-gold-2 hover:border-brand-gold'
            }`}
          >
            All ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-5 py-2 font-body text-sm font-semibold tracking-wider uppercase transition-all duration-200 ${
                activeCategory === cat.id ? 'bg-gold-gradient text-brand-black' : 'border border-brand-gold/30 text-brand-gold-2 hover:border-brand-gold'
              }`}
            >
              {cat.icon} {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-brand-black-2 border border-brand-gold/20 px-3 py-2 flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="text-brand-gold-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="bg-transparent text-brand-cream text-sm font-body placeholder-brand-cream/30 focus:outline-none flex-1"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}><X size={12} className="text-brand-cream/40" /></button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-brand-black-2 border border-brand-gold/20 text-brand-cream text-sm font-body px-4 py-2 pr-8 focus:outline-none focus:border-brand-gold cursor-pointer"
            >
              {sortOptions.map(o => (
                <option key={o.value} value={o.value} className="bg-brand-black-2">{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-gold-2 pointer-events-none" />
          </div>

          {/* Active filters */}
          {badgeFilter && (
            <button
              onClick={() => setBadgeFilter('')}
              className="flex items-center gap-1 px-3 py-2 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold-2 text-xs font-body"
            >
              {badgeFilter} <X size={12} />
            </button>
          )}

          <p className="ml-auto font-body text-sm text-brand-cream/40">{filtered.length} items</p>
        </div>

        {/* Products grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="font-heading text-2xl text-brand-cream/40 mb-2">No products found</p>
              <p className="font-body text-sm text-brand-cream/30 mb-6">Try adjusting your filters or search term</p>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); setBadgeFilter('') }} className="btn-outline-gold">
                Clear Filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-black pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-brand-cream/50 text-sm">Loading collection...</p>
        </div>
      </div>
    }>
      <ShopContent />
    </Suspense>
  )
}

