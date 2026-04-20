'use client'
import { useState } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ShoppingBag, Heart, Share2, Truck, Shield, ChevronLeft, ChevronRight, Check, Plus, Minus, MessageCircle } from 'lucide-react'
import { products, formatPrice } from '@/lib/products'
import ProductCard from '@/components/shop/ProductCard'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function ProductDetail({ slug }: { slug: string }) {
  const productData = products.find(p => p.slug === slug)
  if (!productData) notFound()
  const product = productData!

  const [activeImg,    setActiveImg]    = useState(0)
  const [selectedVars, setSelectedVars] = useState<Record<string, string>>({})
  const [qty,          setQty]          = useState(1)
  const [wished,       setWished]       = useState(false)
  const [activeTab,    setActiveTab]    = useState<'details' | 'shipping' | 'reviews'>('details')

  const { addItem, openCart, currency } = useCartStore()
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4)

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) addItem(product, selectedVars)
    toast.success('✨ Added to your cart!', { duration: 2500 })
    openCart()
  }

  const allVarsSelected = !product.variants || product.variants.every(v => selectedVars[v.label])

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
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

            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative w-20 h-20 overflow-hidden border-2 transition-all duration-200 ${
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
                    <Star key={i} size={16} className={i < Math.floor(product.rating) ? 'fill-brand-gold-2 text-brand-gold-2' : 'text-brand-gold/20'} />
                  ))}
                </div>
                <span className="font-body text-sm text-brand-cream/60">{product.rating} · {product.reviews} reviews</span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-display text-4xl font-bold gold-text">{formatPrice(product.price, currency)}</span>
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
                  <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <motion.button
                  onClick={handleAddToCart}
                  disabled={!allVarsSelected}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 btn-gold flex items-center justify-center gap-2 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={18} />
                  {allVarsSelected ? 'Add to Cart' : 'Select Options'}
                </motion.button>
                <motion.button
                  onClick={() => setWished(!wished)}
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 border border-brand-gold/30 flex items-center justify-center text-brand-cream hover:border-brand-gold hover:text-brand-gold-3 transition-all duration-200"
                >
                  <Heart size={18} className={wished ? 'fill-red-500 text-red-500' : ''} />
                </motion.button>
              </div>

              <a
                href={`https://wa.me/+8613800138000?text=Hi! I'd like to order: ${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all duration-200 font-body text-sm font-semibold mb-6"
              >
                <MessageCircle size={16} />
                Order via WhatsApp
              </a>

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
          <div className="flex border-b border-brand-gold/20">
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
              <div>
                <div className="flex items-center gap-6 mb-8 p-5 bg-brand-black-2 border border-brand-gold/20">
                  <div className="text-center">
                    <p className="font-display text-5xl font-bold gold-text">{product.rating}</p>
                    <div className="flex justify-center my-1">
                      {Array(5).fill(null).map((_, i) => (
                        <Star key={i} size={14} className={i < Math.floor(product.rating) ? 'fill-brand-gold-2 text-brand-gold-2' : 'text-brand-gold/20'} />
                      ))}
                    </div>
                    <p className="font-body text-xs text-brand-cream/40">{product.reviews} reviews</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                      const pct = star === 5 ? 78 : star === 4 ? 15 : star === 3 ? 5 : star === 2 ? 1 : 1
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="font-body text-xs text-brand-cream/40 w-2">{star}</span>
                          <Star size={10} className="fill-brand-gold-2 text-brand-gold-2" />
                          <div className="flex-1 h-1.5 bg-brand-black-3 rounded overflow-hidden">
                            <div className="h-full bg-gold-gradient" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-body text-xs text-brand-cream/40 w-7">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <p className="font-body text-sm text-brand-cream/40 text-center">Reviews are verified from customers who purchased this product.</p>
              </div>
            )}
          </div>
        </div>

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
    </div>
  )
}
