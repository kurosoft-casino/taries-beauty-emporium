'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { products } from '@/lib/products'
import ProductCard from '@/components/shop/ProductCard'

interface Props {
  currentSlug: string
  currentCategory: string
}

export default function AlsoBought({ currentSlug, currentCategory }: Props) {
  const suggestions = useMemo(() => {
    return products
      .filter(p => p.category === currentCategory && p.slug !== currentSlug)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4)
  }, [currentSlug, currentCategory])

  if (suggestions.length === 0) return null

  return (
    <section className="py-16 bg-brand-black-2 border-t border-brand-gold/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="section-label mb-2">✦ You Might Love These Too ✦</p>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-brand-cream mb-8">
            Customers Also <span className="gold-text">Bought</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {suggestions.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
