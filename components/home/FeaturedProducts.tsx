'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import ProductCard from '@/components/shop/ProductCard'
import { products } from '@/lib/products'

interface FeaturedProductsProps {
  title?: string
  subtitle?: string
  filter?: (p: typeof products[0]) => boolean
  limit?: number
  viewAllHref?: string
}

export default function FeaturedProducts({
  title = 'Featured Products',
  subtitle = 'Handpicked luxury pieces for every queen',
  filter = (p) => !!p.badge,
  limit = 8,
  viewAllHref = '/shop',
}: FeaturedProductsProps) {
  const featured = products.filter(filter).slice(0, limit)

  return (
    <section className="py-16 sm:py-24 bg-brand-black-2 relative overflow-hidden">
      <div className="orb orb-gold w-96 h-96 top-0 right-0 opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-label"
            >
              ✦ Taries Picks ✦
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="section-title text-brand-cream"
            >
              {title.includes(' ') ? (
                <>
                  {title.split(' ').slice(0, -1).join(' ')}{' '}
                  <span className="gold-text">{title.split(' ').slice(-1)}</span>
                </>
              ) : <span className="gold-text">{title}</span>}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="font-body text-brand-cream/50 mt-2"
            >
              {subtitle}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link href={viewAllHref} className="btn-outline-gold flex items-center gap-2 whitespace-nowrap">
              View All <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {featured.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
