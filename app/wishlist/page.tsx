'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, X, Trash2, ArrowLeft } from 'lucide-react'
import { getWishlist, loadWishlist, toggleWishlistForUser, clearWishlistForUser } from '@/lib/wishlist'
import { products, formatPrice } from '@/lib/products'
import { getProductHref, type StorefrontProduct } from '@/lib/catalog'
import { useStorefrontCatalog } from '@/lib/useStorefrontCatalog'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function WishlistPage() {
  const [slugs, setSlugs] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const { addItem, openCart, currency } = useCartStore()
  const catalog = useStorefrontCatalog()

  useEffect(() => {
    setMounted(true)
    void (async () => {
      setSlugs(await loadWishlist())
    })()
  }, [])

  async function handleRemove(slug: string) {
    await toggleWishlistForUser(slug)
    setSlugs(getWishlist())
  }

  async function handleClearAll() {
    await clearWishlistForUser()
    setSlugs([])
    toast.success('Wishlist cleared')
  }

  function resolveProduct(slug: string): StorefrontProduct | undefined {
    return catalog.find(p => p.slug === slug)
      ?? (products.find(p => p.slug === slug) as StorefrontProduct | undefined)
  }

  function handleAddToCart(product: StorefrontProduct) {
    addItem(product, {})
    toast.success(`✨ ${product.name.split(' ').slice(0, 3).join(' ')}... added!`, { duration: 2500 })
    openCart()
  }

  const wishlisted = slugs
    .map(slug => resolveProduct(slug))
    .filter((p): p is StorefrontProduct => !!p)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="section-label mb-1">My Collection</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-cream">
              My <span className="gold-text">Wishlist</span>
            </h1>
            {wishlisted.length > 0 && (
              <p className="font-body text-sm text-brand-cream/40 mt-1">
                {wishlisted.length} item{wishlisted.length !== 1 ? 's' : ''} saved
              </p>
            )}
          </div>
          {wishlisted.length > 0 && (
            <motion.button
              onClick={handleClearAll}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 text-xs font-body font-semibold rounded transition-all duration-200"
            >
              <Trash2 size={13} />
              Clear Wishlist
            </motion.button>
          )}
        </div>

        {/* Empty state */}
        {wishlisted.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-6">
              <Heart size={36} className="text-brand-gold/40" />
            </div>
            <h2 className="font-display text-2xl font-bold text-brand-cream mb-3">Your wishlist is empty</h2>
            <p className="font-body text-sm text-brand-cream/40 max-w-xs mb-8">
              Save products you love to your wishlist and come back to them any time.
            </p>
            <Link href="/shop" className="btn-gold flex items-center gap-2">
              <ArrowLeft size={16} />
              Start Shopping
            </Link>
          </motion.div>
        )}

        {/* Products grid */}
        {wishlisted.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {wishlisted.map((product, i) => (
                <motion.div
                  key={product.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="bg-brand-black-2 border border-brand-gold/15 hover:border-brand-gold/35 rounded-xl overflow-hidden group transition-colors duration-300"
                >
                  {/* Image */}
                  <Link href={getProductHref(product)} className="block relative aspect-[3/4] overflow-hidden bg-brand-black-3">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 via-transparent to-transparent" />
                    {/* Remove button */}
                    <motion.button
                      onClick={e => { e.preventDefault(); void handleRemove(product.slug) }}
                      whileTap={{ scale: 0.8 }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full glass-dark flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                      title="Remove from wishlist"
                    >
                      <X size={14} />
                    </motion.button>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    <p className="font-body text-[10px] tracking-widest text-brand-gold-2/70 uppercase mb-1">
                      {product.categoryLabel}
                    </p>
                    <Link href={getProductHref(product)}>
                      <h3 className="font-heading text-sm font-semibold text-brand-cream mb-2 line-clamp-2 hover:text-brand-gold-3 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="font-heading text-base font-bold text-brand-gold-3 mb-4">
                      {formatPrice(product.price, currency)}
                    </p>

                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => handleAddToCart(product)}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 btn-gold flex items-center justify-center gap-1.5 !py-2 !text-xs"
                      >
                        <ShoppingBag size={13} />
                        Add to Cart
                      </motion.button>
                      <motion.button
                        onClick={() => void handleRemove(product.slug)}
                        whileTap={{ scale: 0.9 }}
                        className="w-9 h-9 flex items-center justify-center border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded transition-all duration-200"
                        title="Remove"
                      >
                        <Heart size={14} className="fill-red-500" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {wishlisted.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/shop"
              className="btn-outline-gold inline-flex items-center gap-2"
            >
              <ArrowLeft size={15} />
              Continue Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
