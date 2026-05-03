'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingBag, Heart, Eye, Star, Zap } from 'lucide-react'
import { formatPrice, type Product } from '@/lib/products'
import { useCartStore } from '@/lib/store'
import { toggleWishlist, isWishlisted } from '@/lib/wishlist'
import toast from 'react-hot-toast'
import { getProductHref, type StorefrontProduct } from '@/lib/catalog'
import FallbackImage from '@/components/ui/FallbackImage'

interface ProductCardProps {
  product: Product | StorefrontProduct
  index?: number
}

export default function ProductCard({ product, index: _index = 0 }: ProductCardProps) {
  const [wished, setWished] = useState(false)
  const [imageIdx, setImageIdx] = useState(0)

  const { addItem, openCart, currency } = useCartStore()

  useEffect(() => {
    setWished(isWishlisted(product.slug))
  }, [product.slug])

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!product.inStock) {
      toast.error('This item is currently out of stock')
      return
    }
    addItem(product)
    toast.success(`✨ ${product.name.split(' ').slice(0, 3).join(' ')}... added!`, { duration: 2500 })
    openCart()
  }

  const badge = product.badge
  const href = 'source' in product ? getProductHref(product) : `/product/${product.slug}`
  const discountPct = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null

  return (
    <div className="transition-transform duration-300 hover:-translate-y-1">
      <div className="group cursor-pointer relative bg-[#FFF8E7] border-2 border-brand-gold/40 hover:border-brand-gold transition-all duration-500 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_60px_-15px_rgba(212,175,55,0.6)]">
        <Link href={href}>
          {/* Image */}
          <div className="relative overflow-hidden aspect-[3/4] bg-white">
            <FallbackImage
              src={product.images[imageIdx] || product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              style={{ filter: 'brightness(1.05) contrast(1.02)' }}
            />

            {/* Subtle overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Glow ring on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 40px rgba(212,175,55,0.15)' }} />

            {/* Badge */}
            {badge && (
              <span className={
                badge === 'sale' ? 'badge-sale' :
                badge === 'new'  ? 'badge-new'  :
                'badge-hot'
              }>
                {badge === 'sale' ? `–${discountPct}%` :
                 badge === 'new'  ? 'New' :
                 badge === 'bestseller' ? '⭐ Best' : '🔥 Hot'}
              </span>
            )}

            {/* Wishlist */}
            <motion.button
              onClick={e => { e.preventDefault(); setWished(toggleWishlist(product.slug)) }}
              whileTap={{ scale: 0.8 }}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full glass-dark flex items-center justify-center transition-all duration-300"
            >
              <Heart
                size={16}
                className={`transition-colors duration-300 ${wished ? 'fill-red-500 text-red-500' : 'text-brand-cream/70'}`}
              />
            </motion.button>

            {/* Second image on hover (if exists) */}
            {product.images.length > 1 && (
              <button
                className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onMouseEnter={() => setImageIdx(1)}
                onMouseLeave={() => setImageIdx(0)}
                onClick={e => e.preventDefault()}
              >
                <Eye size={16} className="text-brand-cream/70" />
              </button>
            )}

            {/* Quick add – slides up on hover */}
            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={handleAddToCart}
                className="w-full py-2.5 bg-gold-gradient text-brand-black text-xs font-body font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:shadow-gold transition-shadow duration-300"
              >
                <ShoppingBag size={14} />
                Add to Cart
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-[#FFF8E7] border-t-2 border-brand-gold/30">
            <p className="font-body text-[10px] tracking-widest text-brand-gold-4 uppercase mb-1 font-bold">{product.categoryLabel}</p>
            <h3 className="font-heading text-sm font-semibold text-brand-black mb-2 line-clamp-2 group-hover:text-brand-gold-4 transition-colors duration-300">
              {product.name}
            </h3>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {Array(5).fill(null).map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={i < Math.floor(product.rating) ? 'fill-brand-gold-2 text-brand-gold-2' : 'text-brand-gold/20'}
                  />
                ))}
              </div>
              <span className="font-body text-[10px] text-brand-black/70 font-semibold">({product.reviews})</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="font-heading text-base font-bold text-brand-black">
                {formatPrice(product.price, currency)}
              </span>
              {product.originalPrice && (
                <span className="font-body text-xs text-brand-black/50 line-through">
                  {formatPrice(product.originalPrice, currency)}
                </span>
              )}
            </div>

            {/* Ships from */}
            <p className="font-body text-[10px] text-brand-black/70 mt-2 flex items-center gap-1 font-medium">
              <Zap size={9} className="text-brand-gold-4" />
              {product.deliveryDays} · {product.shipsFrom}
            </p>
            <p className={`font-body text-[10px] mt-1 font-bold ${product.inStock ? 'text-green-700' : 'text-red-700'}`}>
              {product.inStock
                ? product.stockCount && product.stockCount <= 5
                  ? `Only ${product.stockCount} left`
                  : 'In stock'
                : 'Out of stock'}
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
/* build trigger 1777108138 */
