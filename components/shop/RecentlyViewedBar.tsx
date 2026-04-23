'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { products, formatPrice } from '@/lib/products'
import { useCartStore } from '@/lib/store'
import { getRecentlyViewed } from '@/lib/recentlyViewed'

export default function RecentlyViewedBar() {
  const [slugs, setSlugs] = useState<string[]>([])
  const { currency } = useCartStore()

  useEffect(() => {
    setSlugs(getRecentlyViewed())
  }, [])

  const recentProducts = slugs
    .map(slug => products.find(p => p.slug === slug))
    .filter((p): p is (typeof products)[number] => Boolean(p))

  if (recentProducts.length === 0) return null

  return (
    <section className="py-12 bg-brand-black-2 border-t border-brand-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock size={16} className="text-brand-gold-2" />
          <h2 className="font-heading text-xl font-bold text-brand-cream">
            Recently <span className="gold-text">Viewed</span>
          </h2>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {recentProducts.map((product, i) => (
            <motion.div
              key={product.slug}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0"
            >
              <Link
                href={`/product/${product.slug}`}
                className="flex flex-col bg-brand-black border border-brand-gold/10 hover:border-brand-gold/40 transition-colors w-36 overflow-hidden group"
              >
                <div className="relative w-full h-32 overflow-hidden">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="144px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-2">
                  <p className="font-body text-xs text-brand-cream font-semibold truncate">{product.name}</p>
                  <p className="font-heading text-xs text-brand-gold-3 mt-0.5">{formatPrice(product.price, currency)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
