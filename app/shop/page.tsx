'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { categories, formatPrice } from '@/lib/products'
import { useCartStore } from '@/lib/store'
import { getAllViewsSorted } from '@/lib/views'
import { getProductHref, getStorefrontProducts, type StorefrontProduct } from '@/lib/catalog'

const ITEMS_PER_PAGE = 12

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest Drops' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

type SortValue = (typeof sortOptions)[number]['value']

type ViewMode = 'grid' | 'list'

type BadgeFilter = 'all' | 'new' | 'sale' | 'hot' | 'bestseller'

function badgeLabel(badge: StorefrontProduct['badge']) {
  if (badge === 'sale') return 'SALE'
  if (badge === 'new') return 'NEW'
  if (badge === 'bestseller') return 'BEST'
  return 'HOT'
}

function badgeClass(badge: StorefrontProduct['badge']) {
  if (badge === 'sale') return 'bg-[#7a1030] text-white'
  if (badge === 'new') return 'bg-[#f2d27a] text-brand-black'
  if (badge === 'bestseller') return 'bg-[#e2b53a] text-brand-black'
  return 'bg-[#d4af37] text-brand-black'
}

interface ProductCardModernProps {
  product: StorefrontProduct
  index: number
  onAdd: (product: StorefrontProduct) => void
  currency: 'NGN' | 'GHS' | 'USD' | 'CNY'
}

function ProductCardModern({ product, index, onAdd, currency }: ProductCardModernProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="group relative overflow-hidden border border-brand-gold/20 bg-[#f8f2e4] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/55"
    >
      <Link href={getProductHref(product)} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f4e7cb]">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

          {product.badge && (
            <span className={`absolute left-3 top-3 z-10 px-2 py-1 text-[10px] font-bold tracking-wider ${badgeClass(product.badge)}`}>
              {badgeLabel(product.badge)}
            </span>
          )}

          <button
            onClick={e => {
              e.preventDefault()
              onAdd(product)
            }}
            className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-center gap-2 bg-gold-gradient px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-brand-black opacity-0 transition-all duration-300 group-hover:opacity-100"
          >
            <ShoppingBag size={14} />
            {product.inStock ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>

        <div className="space-y-2 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7c5f1a]">{product.categoryLabel}</p>
          <h3 className="line-clamp-2 font-heading text-xl font-semibold text-brand-black">{product.name}</h3>

          <div className="flex items-center gap-1.5 text-[#a57d12]">
            <Star size={12} className="fill-[#d4af37] text-[#d4af37]" />
            <span className="text-xs font-semibold text-brand-black/80">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-brand-black/50">({product.reviews})</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="font-heading text-3xl font-bold text-brand-black">{formatPrice(product.price, currency)}</span>
            {product.originalPrice && (
              <span className="text-sm text-brand-black/45 line-through">{formatPrice(product.originalPrice, currency)}</span>
            )}
          </div>

          <p className={`text-xs font-semibold ${product.inStock ? 'text-green-700' : 'text-red-700'}`}>
            {product.inStock
              ? product.stockCount && product.stockCount <= 5
                ? `Only ${product.stockCount} left`
                : 'In stock'
              : 'Out of stock'}
          </p>
        </div>
      </Link>
    </motion.article>
  )
}

interface ProductListRowProps {
  product: StorefrontProduct
  index: number
  onAdd: (product: StorefrontProduct) => void
  currency: 'NGN' | 'GHS' | 'USD' | 'CNY'
}

function ProductListRow({ product, index, onAdd, currency }: ProductListRowProps) {
  return (
    <motion.article
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.2) }}
      className="group grid grid-cols-[110px,1fr] gap-4 border border-brand-gold/18 bg-brand-black-2 p-3 transition-colors hover:border-brand-gold/45 sm:grid-cols-[170px,1fr]"
    >
      <Link href={getProductHref(product)} className="relative block h-[130px] overflow-hidden sm:h-[170px]">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="170px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="min-w-0 py-1">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-brand-gold-2/80">{product.categoryLabel}</p>
        <Link href={getProductHref(product)} className="inline-flex items-start gap-2">
          <h3 className="line-clamp-2 font-heading text-xl text-brand-cream transition-colors group-hover:text-brand-gold-3">{product.name}</h3>
          <ArrowUpRight size={15} className="mt-1 shrink-0 text-brand-gold-2/70" />
        </Link>

        <p className="mt-2 line-clamp-2 text-sm text-brand-cream/55">{product.shortDesc}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-heading text-2xl font-bold text-brand-gold-3">{formatPrice(product.price, currency)}</span>
          {product.originalPrice && (
            <span className="text-sm text-brand-cream/35 line-through">{formatPrice(product.originalPrice, currency)}</span>
          )}
          <span className={`text-xs font-semibold ${product.inStock ? 'text-green-400' : 'text-red-400'}`}>
            {product.inStock ? 'In stock' : 'Out of stock'}
          </span>

          <button
            onClick={() => onAdd(product)}
            className="ml-auto flex items-center gap-2 bg-gold-gradient px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-brand-black transition-opacity hover:opacity-90"
          >
            <ShoppingBag size={13} />
            {product.inStock ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>
      </div>
    </motion.article>
  )
}

function ShopContent() {
  const searchParams = useSearchParams()
  const { addItem, openCart, currency } = useCartStore()

  const [allProducts, setAllProducts] = useState<StorefrontProduct[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortValue>('featured')
  const [stockOnly, setStockOnly] = useState(false)
  const [view, setView] = useState<ViewMode>('grid')
  const [badge, setBadge] = useState<BadgeFilter>('all')
  const [maxPrice, setMaxPrice] = useState(500)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const products = getStorefrontProducts()
    setAllProducts(products)

    const incomingCategory = searchParams.get('category')
    const incomingSearch = searchParams.get('search')
    const incomingBadge = searchParams.get('badge')

    const categoryValid = incomingCategory && (incomingCategory === 'all' || categories.some(c => c.id === incomingCategory))
    setActiveCategory(categoryValid ? incomingCategory : 'all')
    setSearch(incomingSearch ?? '')

    const validBadge: BadgeFilter =
      incomingBadge === 'new' ||
      incomingBadge === 'sale' ||
      incomingBadge === 'hot' ||
      incomingBadge === 'bestseller'
        ? incomingBadge
        : 'all'
    setBadge(validBadge)
  }, [searchParams])

  useEffect(() => {
    setPage(1)
  }, [activeCategory, search, sort, stockOnly, badge, maxPrice, view])

  const categoryRows = useMemo(() => {
    const rows = categories.map(category => ({
      id: category.id,
      label: category.label,
      icon: category.icon,
      count: allProducts.filter(product => product.category === category.id).length,
    }))

    return [{ id: 'all', label: 'All Products', icon: '✦', count: allProducts.length }, ...rows]
  }, [allProducts])

  const filtered = useMemo(() => {
    let list = [...allProducts]

    if (activeCategory !== 'all') list = list.filter(product => product.category === activeCategory)
    if (stockOnly) list = list.filter(product => product.inStock)
    if (badge !== 'all') list = list.filter(product => product.badge === badge)
    list = list.filter(product => product.price <= maxPrice)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(product =>
        product.name.toLowerCase().includes(q) ||
        product.shortDesc.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

    if (sort === 'price-asc') return [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') return [...list].sort((a, b) => b.price - a.price)
    if (sort === 'rating') return [...list].sort((a, b) => b.rating - a.rating)

    if (sort === 'popular') {
      const views = getAllViewsSorted()
      const score: Record<string, number> = {}
      for (const entry of views) score[entry.slug] = entry.views
      return [...list].sort((a, b) => (score[b.slug] ?? 0) - (score[a.slug] ?? 0))
    }

    if (sort === 'newest') {
      return [...list].sort((a, b) => {
        const rank = (value?: StorefrontProduct['badge']) => {
          if (value === 'new') return 4
          if (value === 'hot') return 3
          if (value === 'sale') return 2
          if (value === 'bestseller') return 1
          return 0
        }
        return rank(b.badge) - rank(a.badge)
      })
    }

    return list
  }, [allProducts, activeCategory, stockOnly, badge, maxPrice, search, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))

  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  function handleAddToCart(product: StorefrontProduct) {
    if (!product.inStock) {
      toast.error('This item is currently out of stock')
      return
    }

    addItem(product)
    toast.success(`${product.name.split(' ').slice(0, 3).join(' ')} added to cart`)
    openCart()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-black pb-24 pt-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 440px at 12% -3%, rgba(212,175,55,0.16), transparent 65%), radial-gradient(700px 300px at 85% 10%, rgba(212,175,55,0.1), transparent 62%)',
        }}
      />

      <section className="relative border-b border-brand-gold/20 bg-brand-black-2/65">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex w-fit items-center gap-2 text-xs uppercase tracking-[0.35em] text-brand-gold-2"
          >
            <Sparkles size={13} />
            Completely Rebuilt Shop
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-heading text-5xl leading-tight text-brand-cream sm:text-6xl"
          >
            New <span className="gold-text">Shop Experience</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-3xl text-sm text-brand-cream/60 sm:text-base"
          >
            Faster discovery, cleaner product visibility, smoother transitions, and richer product browsing across every category.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center gap-3 text-sm"
          >
            <span className="border border-brand-gold/25 px-3 py-1 text-brand-gold-2">{filtered.length} matched</span>
            <span className="border border-brand-gold/25 px-3 py-1 text-brand-gold-2">{allProducts.length} total products</span>
            <span className="border border-brand-gold/25 px-3 py-1 text-brand-gold-2">Page {page} of {totalPages}</span>
          </motion.div>
        </div>
      </section>

      <div className="relative mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categoryRows.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveCategory(item.id)}
              className={`shrink-0 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all sm:text-sm ${
                activeCategory === item.id
                  ? 'border-transparent bg-gold-gradient text-brand-black'
                  : 'border-brand-gold/30 text-brand-gold-2 hover:border-brand-gold/75'
              }`}
            >
              {item.icon} {item.label} ({item.count})
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-3 border border-brand-gold/18 bg-brand-black-2/70 p-4 lg:grid-cols-[1.3fr,220px,220px,170px]">
          <label className="flex items-center gap-2 border border-brand-gold/20 px-3 py-2.5">
            <Search size={15} className="text-brand-gold-2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products, textures, bundles, categories..."
              className="w-full bg-transparent text-sm text-brand-cream placeholder:text-brand-cream/35 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-brand-cream/45 transition-colors hover:text-brand-cream"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <label className="relative flex items-center border border-brand-gold/20 px-3">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortValue)}
              className="w-full appearance-none bg-transparent py-2.5 pr-7 text-sm text-brand-cream focus:outline-none"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-brand-black-2">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 text-brand-gold-2" />
          </label>

          <label className="flex items-center gap-2 border border-brand-gold/20 px-3 py-2.5 text-sm text-brand-cream/80">
            <input
              type="range"
              min={20}
              max={500}
              step={5}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#d4af37]"
            />
            <span className="w-16 shrink-0 text-right text-brand-gold-2">${maxPrice}</span>
          </label>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setStockOnly(value => !value)}
              className={`flex items-center gap-2 border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                stockOnly
                  ? 'border-brand-gold bg-brand-gold/15 text-brand-gold-3'
                  : 'border-brand-gold/25 text-brand-cream/55 hover:border-brand-gold/55'
              }`}
            >
              {stockOnly ? 'In Stock' : 'Any Stock'}
            </button>

            <div className="flex items-center border border-brand-gold/20">
              <button
                onClick={() => setView('grid')}
                className={`p-2 ${view === 'grid' ? 'bg-brand-gold/25 text-brand-gold-3' : 'text-brand-cream/50 hover:text-brand-cream'}`}
                aria-label="Grid view"
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 ${view === 'list' ? 'bg-brand-gold/25 text-brand-gold-3' : 'text-brand-cream/50 hover:text-brand-cream'}`}
                aria-label="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:col-span-4">
            {(['all', 'new', 'sale', 'hot', 'bestseller'] as BadgeFilter[]).map(value => (
              <button
                key={value}
                onClick={() => setBadge(value)}
                className={`border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  badge === value
                    ? 'border-transparent bg-gold-gradient text-brand-black'
                    : 'border-brand-gold/25 text-brand-gold-2 hover:border-brand-gold/55'
                }`}
              >
                {value === 'all' ? 'All badges' : value}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="border border-brand-gold/20 bg-brand-black-2/70 px-6 py-20 text-center">
            <h2 className="font-heading text-3xl text-brand-cream">No products match this filter</h2>
            <p className="mt-2 text-sm text-brand-cream/55">Try another category, clear the search, or increase max price.</p>
            <button
              onClick={() => {
                setActiveCategory('all')
                setSearch('')
                setSort('featured')
                setStockOnly(false)
                setBadge('all')
                setMaxPrice(500)
              }}
              className="mt-5 border border-brand-gold/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-gold-2 transition-colors hover:border-brand-gold"
            >
              Reset Filters
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginated.map((product, index) => (
              <ProductCardModern
                key={product.id}
                product={product}
                index={index}
                onAdd={handleAddToCart}
                currency={currency}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map((product, index) => (
              <ProductListRow
                key={product.id}
                product={product}
                index={index}
                onAdd={handleAddToCart}
                currency={currency}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 border border-brand-gold/25 px-3 py-2 text-xs text-brand-cream/70 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`h-9 w-9 border text-sm font-semibold transition-colors ${
                    page === pageNumber
                      ? 'border-transparent bg-gold-gradient text-brand-black'
                      : 'border-brand-gold/25 text-brand-cream/70 hover:border-brand-gold/60'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 border border-brand-gold/25 px-3 py-2 text-xs text-brand-cream/70 disabled:opacity-40"
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-black pt-32">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
            <p className="text-sm text-brand-cream/50">Loading new shop experience...</p>
          </div>
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  )
}
