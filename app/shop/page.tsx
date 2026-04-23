'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Grid, List, X, Search, ChevronDown, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import { products, categories, formatPrice, type Category } from '@/lib/products'
import { getAllViewsSorted } from '@/lib/views'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'

const ITEMS_PER_PAGE = 12

const sortOptions = [
  { label: 'Featured',      value: 'featured' },
  { label: 'Newest',        value: 'new' },
  { label: 'Price: Low',    value: 'price-asc' },
  { label: 'Price: High',   value: 'price-desc' },
  { label: 'Best Rated',    value: 'rating' },
  { label: 'Most Reviews',  value: 'reviews' },
  { label: 'Most Popular',  value: 'popular' },
]

function ShopContent() {
  const searchParams = useSearchParams()
  const [activeCategory, setActiveCategory] = useState<string>(searchParams.get('category') || 'all')
  const [sort,           setSort]           = useState('featured')
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [searchQuery,    setSearchQuery]    = useState(searchParams.get('search') || '')
  const [priceRange,     setPriceRange]     = useState([0, 500])
  const [badgeFilter,    setBadgeFilter]    = useState(searchParams.get('badge') || '')
  const [viewMode,       setViewMode]       = useState<'grid' | 'list'>('grid')
  const [inStockOnly,    setInStockOnly]    = useState(false)
  const [currentPage,    setCurrentPage]    = useState(1)

  const { addItem, openCart, currency } = useCartStore()

  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) setActiveCategory(cat)
    const q = searchParams.get('search')
    if (q) setSearchQuery(q)
    const b = searchParams.get('badge')
    if (b) setBadgeFilter(b)
  }, [searchParams])

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, sort, searchQuery, badgeFilter, priceRange, inStockOnly])

  const filtered = useMemo(() => {
    let list = [...products]
    if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory)
    if (inStockOnly) list = list.filter(p => p.inStock === true)
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
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price)
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price)
      case 'rating':     return [...list].sort((a, b) => b.rating - a.rating)
      case 'reviews':    return [...list].sort((a, b) => b.reviews - a.reviews)
      case 'popular': {
        const viewsData = getAllViewsSorted()
        const viewMap: Record<string, number> = {}
        viewsData.forEach(v => { viewMap[v.slug] = v.views })
        return [...list].sort((a, b) => (viewMap[b.slug] ?? 0) - (viewMap[a.slug] ?? 0))
      }
      default: return list
    }
  }, [activeCategory, sort, searchQuery, badgeFilter, priceRange, inStockOnly])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

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

          {/* In-stock toggle */}
          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`flex items-center gap-2 px-3 py-2 border text-xs font-body font-semibold transition-all shrink-0 ${
              inStockOnly
                ? 'bg-brand-gold/20 border-brand-gold text-brand-gold-3'
                : 'border-brand-gold/20 text-brand-cream/50 hover:border-brand-gold/40'
            }`}
          >
            <div className={`w-8 h-4 rounded-full transition-colors relative ${inStockOnly ? 'bg-brand-gold' : 'bg-brand-black-3 border border-brand-gold/30'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-brand-cream transition-transform ${inStockOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            In Stock Only
          </button>

          {/* Active filters */}
          {badgeFilter && (
            <button
              onClick={() => setBadgeFilter('')}
              className="flex items-center gap-1 px-3 py-2 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold-2 text-xs font-body"
            >
              {badgeFilter} <X size={12} />
            </button>
          )}

          {/* Grid / List toggle */}
          <div className="flex items-center border border-brand-gold/20 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-brand-gold/20 text-brand-gold-3' : 'text-brand-cream/40 hover:text-brand-cream/70'}`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-brand-gold/20 text-brand-gold-3' : 'text-brand-cream/40 hover:text-brand-cream/70'}`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          <p className="font-body text-sm text-brand-cream/40 shrink-0">{filtered.length} items</p>
        </div>

        {/* Products */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="font-heading text-2xl text-brand-cream/40 mb-2">No products found</p>
              <p className="font-body text-sm text-brand-cream/30 mb-6">Try adjusting your filters or search term</p>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); setBadgeFilter(''); setInStockOnly(false) }} className="btn-outline-gold">
                Clear Filters
              </button>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {paginated.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div layout className="flex flex-col gap-4">
              {paginated.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-5 bg-brand-black-2 border border-brand-gold/10 hover:border-brand-gold/30 transition-colors p-4"
                >
                  <Link href={`/product/${product.slug}`} className="relative w-48 h-48 shrink-0 overflow-hidden">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="192px"
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                    {product.badge && (
                      <span className={
                        product.badge === 'sale' ? 'badge-sale' :
                        product.badge === 'new'  ? 'badge-new'  : 'badge-hot'
                      }>
                        {product.badge === 'sale' ? 'Sale' : product.badge === 'new' ? 'New' : product.badge === 'bestseller' ? '⭐ Best' : '🔥 Hot'}
                      </span>
                    )}
                  </Link>
                  <div className="flex flex-col flex-1 min-w-0 py-1">
                    <p className="font-body text-[10px] tracking-widest text-brand-gold-2/70 uppercase mb-1">{product.categoryLabel}</p>
                    <Link href={`/product/${product.slug}`}>
                      <h3 className="font-heading text-lg font-semibold text-brand-cream hover:text-brand-gold-3 transition-colors mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="font-body text-sm text-brand-cream/50 leading-relaxed mb-3 line-clamp-2">{product.shortDesc}</p>
                    {product.variants && product.variants.length > 0 && (
                      <p className="font-body text-xs text-brand-gold-2/60 mb-3">
                        {product.variants.map(v => `${v.label}: ${v.options.slice(0, 3).join(', ')}${v.options.length > 3 ? '…' : ''}`).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-auto">
                      <div>
                        <span className="font-heading text-xl font-bold text-brand-gold-3">
                          {formatPrice(product.price, currency)}
                        </span>
                        {product.originalPrice && (
                          <span className="font-body text-sm text-brand-cream/30 line-through ml-2">
                            {formatPrice(product.originalPrice, currency)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          addItem(product)
                          toast.success(`✨ ${product.name.split(' ').slice(0, 3).join(' ')}... added!`, { duration: 2500 })
                          openCart()
                        }}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-gold-gradient text-brand-black text-xs font-body font-bold tracking-widest uppercase hover:shadow-gold transition-shadow"
                      >
                        <ShoppingBag size={14} /> Add to Cart
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-4 py-2 border border-brand-gold/20 text-brand-cream/60 text-sm font-body hover:border-brand-gold hover:text-brand-cream transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 flex items-center justify-center text-sm font-body font-semibold border transition-all ${
                    currentPage === page
                      ? 'bg-gold-gradient text-brand-black border-transparent'
                      : 'border-brand-gold/20 text-brand-cream/60 hover:border-brand-gold hover:text-brand-cream'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-4 py-2 border border-brand-gold/20 text-brand-cream/60 text-sm font-body hover:border-brand-gold hover:text-brand-cream transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
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

