'use client'
import { useState, useEffect, useRef } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ShoppingBag, Heart, Share2, Truck, Shield, ChevronLeft, ChevronRight, Check, Plus, Minus, MessageCircle, ZoomIn, Video } from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { getBundlesForProduct } from '@/lib/bundles'
import ProductCard from '@/components/shop/ProductCard'
import ProductReviews from '@/components/shop/ProductReviews'
import { useCartStore } from '@/lib/store'
import { incrementView } from '@/lib/views'
import { toggleWishlist, isWishlisted } from '@/lib/wishlist'
import { getAverageRating, getReviewCount, seedReviewsIfEmpty } from '@/lib/reviews'
import { addRecentlyViewed } from '@/lib/recentlyViewed'
import FlashSaleTimer from '@/components/shop/FlashSaleTimer'
import RecentlyViewedBar from '@/components/shop/RecentlyViewedBar'
import toast from 'react-hot-toast'
import { getCatalogProductBySlug, getStorefrontProducts } from '@/lib/catalog'
import { isValidEmail, normalizeEmail } from '@/lib/validation'
import { readJSON, writeJSON } from '@/lib/storage'

export default function ProductDetail({ slug }: { slug: string }) {
  const productData = getCatalogProductBySlug(slug)
  if (!productData) notFound()
  const product = productData!

  const [activeImg,    setActiveImg]    = useState(0)
  const [selectedVars, setSelectedVars] = useState<Record<string, string>>({})
  const [qty,          setQty]          = useState(1)
  const [wished,       setWished]       = useState(false)
  const [activeTab,    setActiveTab]    = useState<'details' | 'shipping' | 'reviews'>('details')
  const [liveRating,   setLiveRating]   = useState(product.rating)
  const [liveCount,    setLiveCount]    = useState(product.reviews)
  const [shareOpen,    setShareOpen]    = useState(false)
  const [notifyEmail,  setNotifyEmail]  = useState('')
  const [notifySent,   setNotifySent]   = useState(false)
  const [notifyPending, setNotifyPending] = useState(false)
  const [zoomOpen,     setZoomOpen]     = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  const { addItem, openCart, currency } = useCartStore()
  const related = getStorefrontProducts().filter(p => p.category === product.category && p.id !== product.id).slice(0, 4)
  const bundles = getBundlesForProduct(slug)
  const bundleProducts = bundles.map(bundle => ({
    ...bundle,
    items: getStorefrontProducts().filter(productItem => bundle.productSlugs.includes(productItem.slug)),
  })).filter(bundle => bundle.items.length > 0)

  // Track product view on mount, seed reviews, init wishlist, record recently viewed
  useEffect(() => {
    incrementView(slug)
    addRecentlyViewed(slug)
    seedReviewsIfEmpty()
    setWished(isWishlisted(slug))
    const avg = getAverageRating(slug)
    const cnt = getReviewCount(slug)
    if (avg > 0) setLiveRating(avg)
    if (cnt > 0) setLiveCount(cnt)
  }, [slug])

  // Close share dropdown on outside click
  useEffect(() => {
    if (!shareOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [shareOpen])

  function handleAddToCart() {
    if (!product.inStock) {
      toast.error('This item is currently out of stock')
      return
    }
    for (let i = 0; i < qty; i++) addItem(product, selectedVars)
    toast.success('✨ Added to your cart!', { duration: 2500 })
    openCart()
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('🔗 Link copied to clipboard!')
      setShareOpen(false)
    })
  }

  function handleShareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Check out this product: ${product.name} - ${window.location.href}`)}`,
      '_blank'
    )
    setShareOpen(false)
  }

  function handleShareTwitter() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${product.name}`)}&url=${encodeURIComponent(window.location.href)}`,
      '_blank'
    )
    setShareOpen(false)
  }

  const allVarsSelected = !product.variants || product.variants.every(v => selectedVars[v.label])
  const addToCartDisabled = !allVarsSelected || !product.inStock

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <nav className="flex items-center gap-2 font-body text-xs text-brand-cream/40">
          <Link href="/" className="hover:text-brand-gold-2 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-brand-gold-2 transition-colors">Shop</Link>
          <span>/</span>
          <Link href={`/shop?category=${product.category}`} className="hover:text-brand-gold-2 transition-colors">{product.categoryLabel}</Link>
          <span>/</span>
          <span className="text-brand-cream/70 truncate">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-20">
          {/* Image gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden bg-brand-black-2 group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImg}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={product.images[activeImg]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
              <button
                onClick={() => setZoomOpen(true)}
                className="absolute bottom-3 left-3 glass-dark rounded-full px-3 py-2 flex items-center gap-2 text-xs text-brand-cream opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ZoomIn size={14} />
                Zoom
              </button>

              {product.badge && (
                <span className={
                  product.badge === 'sale' ? 'badge-sale' :
                  product.badge === 'new'  ? 'badge-new'  : 'badge-hot'
                }>
                  {product.badge === 'sale' ? 'Sale' : product.badge === 'new' ? 'New' : product.badge === 'bestseller' ? '⭐ Bestseller' : '🔥 Hot'}
                </span>
              )}

              {product.images.length > 1 && (
                <>
                  <button onClick={() => setActiveImg(i => (i - 1 + product.images.length) % product.images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 glass-dark rounded-full flex items-center justify-center text-brand-cream opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setActiveImg(i => (i + 1) % product.images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 glass-dark rounded-full flex items-center justify-center text-brand-cream opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              <div className="absolute inset-0 border-2 border-brand-gold/0 group-hover:border-brand-gold/30 transition-all duration-500 pointer-events-none" />
            </div>

            {product.video && (
              <div className="border border-brand-gold/20 bg-brand-black-2 p-3">
                <div className="flex items-center gap-2 text-brand-gold-2 text-xs uppercase tracking-widest mb-3">
                  <Video size={14} />
                  Hair movement video
                </div>
                <div className="aspect-video overflow-hidden">
                  <iframe
                    src={product.video}
                    title={`${product.name} video`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {product.images.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border-2 transition-all duration-200 ${
                      activeImg === i ? 'border-brand-gold-2' : 'border-brand-gold/20 hover:border-brand-gold/50'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <p className="section-label mb-2">{product.categoryLabel}</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-cream leading-tight mb-4">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex">
                  {Array(5).fill(null).map((_, i) => (
                    <Star key={i} size={16} className={i < Math.floor(liveRating) ? 'fill-brand-gold-2 text-brand-gold-2' : 'text-brand-gold/20'} />
                  ))}
                </div>
                <span className="font-body text-sm text-brand-cream/60">{liveRating.toFixed(1)} · {liveCount} reviews</span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-display text-2xl sm:text-4xl font-bold gold-text">{formatPrice(product.price, currency)}</span>
                {product.originalPrice && (
                  <span className="font-body text-lg text-brand-cream/30 line-through">{formatPrice(product.originalPrice, currency)}</span>
                )}
                {product.originalPrice && (
                  <span className="font-body text-sm font-bold text-green-400">
                    Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                  </span>
                )}
              </div>

              <p className="font-body text-sm text-brand-cream/60 leading-relaxed mb-6">{product.shortDesc}</p>

              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase ${
                  product.inStock
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
                {product.inStock && product.stockCount && (
                  <span className="text-xs text-brand-gold-2 font-body">
                    {product.stockCount <= 5 ? `Only ${product.stockCount} left in stock` : `${product.stockCount} units ready to ship`}
                  </span>
                )}
                <span className="text-xs text-brand-cream/40 font-body">Delivery estimate: {product.deliveryDays}</span>
              </div>

              {product.badge === 'sale' && <FlashSaleTimer />}

              {product.variants?.map(variant => (
                <div key={variant.label} className="mb-5">
                  <p className="font-body text-xs tracking-widest text-brand-gold-2 uppercase mb-3">
                    {variant.label}: <span className="text-brand-cream">{selectedVars[variant.label] || 'Select'}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setSelectedVars(prev => ({ ...prev, [variant.label]: opt }))}
                        className={`px-3 py-1.5 text-xs font-body font-semibold border transition-all duration-200 ${
                          selectedVars[variant.label] === opt
                            ? 'bg-gold-gradient text-brand-black border-transparent'
                            : 'border-brand-gold/30 text-brand-cream/70 hover:border-brand-gold hover:text-brand-cream'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-4 mb-6">
                <p className="font-body text-xs tracking-widest text-brand-gold-2 uppercase">Quantity</p>
                <div className="flex items-center border border-brand-gold/30">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10 transition-colors">
                    <Minus size={14} />
                  </button>
                  <span className="w-10 h-10 flex items-center justify-center font-body font-semibold text-brand-cream">{qty}</span>
                  <button
                    onClick={() => setQty(q => product.stockCount ? Math.min(product.stockCount, q + 1) : q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <motion.button
                  onClick={handleAddToCart}
                  disabled={addToCartDisabled}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 btn-gold flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={18} />
                  {!product.inStock ? 'Sold Out' : allVarsSelected ? 'Add to Cart' : 'Select Options'}
                </motion.button>
                <motion.button
                  onClick={() => setWished(toggleWishlist(slug))}
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 border border-brand-gold/30 flex items-center justify-center text-brand-cream hover:border-brand-gold hover:text-brand-gold-3 transition-all duration-200"
                >
                  <Heart size={18} className={wished ? 'fill-red-500 text-red-500' : ''} />
                </motion.button>

                {/* Share button */}
                <div className="relative" ref={shareRef}>
                  <motion.button
                    onClick={() => setShareOpen(prev => !prev)}
                    whileTap={{ scale: 0.9 }}
                    className={`w-14 h-14 border flex items-center justify-center transition-all duration-200 ${
                      shareOpen
                        ? 'border-brand-gold text-brand-gold-3 bg-brand-gold/10'
                        : 'border-brand-gold/30 text-brand-cream hover:border-brand-gold hover:text-brand-gold-3'
                    }`}
                    aria-label="Share product"
                  >
                    <Share2 size={18} />
                  </motion.button>

                  <AnimatePresence>
                    {shareOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full right-0 mb-2 bg-brand-black-2 border border-brand-gold/20 shadow-gold-xl min-w-[200px] z-20 py-1"
                      >
                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body text-brand-cream hover:bg-brand-gold/10 transition-colors"
                        >
                          <Check size={15} className="text-brand-gold-2" />
                          Copy Link
                        </button>
                        <button
                          onClick={handleShareWhatsApp}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body text-brand-cream hover:bg-brand-gold/10 transition-colors"
                        >
                          <span className="text-base leading-none">💬</span>
                          WhatsApp
                        </button>
                        <button
                          onClick={handleShareTwitter}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body text-brand-cream hover:bg-brand-gold/10 transition-colors"
                        >
                          <span className="font-bold text-sm text-brand-cream/80">𝕏</span>
                          X (Twitter)
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <a
                href={`https://wa.me/2349035412919?text=Hi! I'd like to order: ${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all duration-200 font-body text-sm font-semibold mb-6"
              >
                <MessageCircle size={16} />
                Order via WhatsApp
              </a>

              {/* Notify Me — shown when out of stock */}
              {!product.inStock && (
                <div className="mb-6 p-4 bg-brand-black-3 border border-brand-gold/20">
                  <p className="font-heading text-sm font-semibold text-brand-cream mb-3">🔔 Out of Stock — Get Notified</p>
                  {notifySent ? (
                    <p className="font-body text-xs text-brand-gold-3">✓ You're on the list! We'll email you when this is back.</p>
                  ) : (
                    <form
                      onSubmit={async e => {
                        e.preventDefault()
                        const email = normalizeEmail(notifyEmail)
                        if (!isValidEmail(email)) {
                          toast.error('Enter a valid email address')
                          return
                        }

                        setNotifyPending(true)

                        try {
                          const response = await fetch('/api/stock-alerts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ slug, email }),
                          })

                          if (!response.ok) {
                            throw new Error((await response.json().catch(() => null))?.error ?? 'Stock alert service is unavailable right now.')
                          }
                        } catch (error) {
                          const key = 'taries-notify-me'
                          const list = readJSON<Array<{ slug: string; email: string; addedAt: string }>>(key, [])
                          const nextList = list.some(item => item.slug === slug && item.email === email)
                            ? list
                            : [...list, { slug, email, addedAt: new Date().toISOString() }]
                          writeJSON(key, nextList)
                          console.error(error)
                        }

                        setNotifyPending(false)
                        setNotifySent(true)
                        toast.success('You\'ll be notified when it\'s back!')
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={e => setNotifyEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="flex-1 bg-brand-black border border-brand-gold/20 px-3 py-2 font-body text-xs text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold/50"
                      />
                        <button type="submit" disabled={notifyPending} className="btn-gold px-4 py-2 text-xs font-semibold shrink-0 disabled:opacity-60">
                          {notifyPending ? 'Saving...' : 'Notify Me'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Truck,   label: product.deliveryDays, sub: `Ships from ${product.shipsFrom}` },
                  { icon: Shield,  label: '100% Authentic',     sub: 'Human hair guaranteed' },
                ].map(badge => (
                  <div key={badge.label} className="flex items-start gap-3 p-3 bg-brand-black-2 border border-brand-gold/10">
                    <badge.icon size={16} className="text-brand-gold-2 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-body text-xs font-semibold text-brand-cream">{badge.label}</p>
                      <p className="font-body text-[10px] text-brand-cream/40">{badge.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border border-brand-gold/20 mb-16">
          <div className="overflow-x-auto">
            <div className="flex border-b border-brand-gold/20 min-w-max">
              {(['details', 'shipping', 'reviews'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-body text-sm font-semibold tracking-wider uppercase capitalize transition-all duration-200 ${
                    activeTab === tab ? 'bg-gold-gradient text-brand-black' : 'text-brand-cream/60 hover:text-brand-cream'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 md:p-8">
            {activeTab === 'details' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-heading text-lg text-brand-cream mb-4">Description</h3>
                  <p className="font-body text-sm text-brand-cream/60 leading-relaxed">{product.description}</p>
                </div>
                <div>
                  <h3 className="font-heading text-lg text-brand-cream mb-4">Features</h3>
                  <ul className="space-y-2">
                    {product.features.map(f => (
                      <li key={f} className="flex items-start gap-2 font-body text-sm text-brand-cream/60">
                        <Check size={14} className="text-brand-gold-2 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {activeTab === 'shipping' && (
              <div className="max-w-2xl space-y-4">
                {[
                  { q: 'Where does this ship from?', a: `All orders ship directly from our manufacturer partners in ${product.shipsFrom}.` },
                  { q: 'How long does delivery take?', a: `Estimated ${product.deliveryDays} to Nigeria and Ghana after order confirmation.` },
                  { q: 'Is there free shipping?', a: 'Yes! Orders over $200 USD (approx ₦324,000) qualify for free standard shipping.' },
                  { q: 'Do you handle customs?', a: 'We ship with all necessary customs documentation. Some orders may attract import duties payable by the recipient.' },
                  { q: 'Can I track my order?', a: 'Yes! A tracking number is provided via WhatsApp and email within 48 hours of dispatch.' },
                ].map(item => (
                  <div key={item.q} className="border-b border-brand-gold/10 pb-4">
                    <p className="font-heading text-sm font-semibold text-brand-cream mb-1">{item.q}</p>
                    <p className="font-body text-sm text-brand-cream/60">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'reviews' && (
              <ProductReviews slug={slug} />
            )}
          </div>
        </div>

        {bundleProducts.length > 0 && (
          <div className="mb-16">
            <h2 className="font-heading text-2xl font-bold text-brand-cream mb-6">
              Frequently Bought <span className="gold-text">Together</span>
            </h2>
            <div className="space-y-4">
              {bundleProducts.map(bundle => (
                <div key={bundle.id} className="border border-brand-gold/20 bg-brand-black-2 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {bundle.badge && <span className="text-xs text-brand-gold-2 uppercase tracking-widest">{bundle.badge}</span>}
                        <span className="text-xs text-green-400">Save ${bundle.savingUsd}</span>
                      </div>
                      <h3 className="font-heading text-xl text-brand-cream">{bundle.name}</h3>
                      <p className="font-body text-sm text-brand-cream/60 mt-1">{bundle.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        {bundle.items.map(item => (
                          <Link key={item.id} href={item.source === 'vendor' ? `/product-preview?id=${encodeURIComponent(item.id)}` : `/product/${item.slug}`} className="flex gap-3 border border-brand-gold/10 p-3 hover:border-brand-gold/30 transition-colors">
                            <div className="relative w-16 h-16 shrink-0 overflow-hidden">
                              <Image src={item.images[0]} alt={item.name} fill className="object-cover" sizes="64px" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-body text-sm text-brand-cream line-clamp-2">{item.name}</p>
                              <p className="font-heading text-sm text-brand-gold-3 mt-1">{formatPrice(item.price, currency)}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        bundle.items.filter(item => item.inStock).forEach(item => addItem(item))
                        toast.success(`${bundle.name} added to cart`)
                        openCart()
                      }}
                      className="btn-gold shrink-0"
                    >
                      Add bundle to cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div>
            <h2 className="font-heading text-2xl font-bold text-brand-cream mb-8">
              You May Also <span className="gold-text">Love</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {zoomOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50"
              onClick={() => setZoomOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-5xl aspect-square bg-brand-black-2 border border-brand-gold/20">
                <Image
                  src={product.images[activeImg]}
                  alt={product.name}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
                <button
                  onClick={() => setZoomOpen(false)}
                  className="absolute top-4 right-4 glass-dark rounded-full px-3 py-2 text-sm text-brand-cream"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <RecentlyViewedBar />
    </div>
  )
}
