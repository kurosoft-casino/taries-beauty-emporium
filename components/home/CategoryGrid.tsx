'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { categories } from '@/lib/products'

export default function CategoryGrid() {
  return (
    <section className="py-16 sm:py-24 bg-brand-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient-h opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gold-gradient-h opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            ✦ Explore Our World ✦
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="section-title text-brand-cream"
          >
            Shop by <span className="gold-text">Collection</span>
          </motion.h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={i === 0 ? 'md:col-span-2 md:row-span-2' : ''}
            >
              <Link href={`/shop?category=${cat.id}`} className="block group relative overflow-hidden rounded-none">
                <div className={`relative overflow-hidden ${i === 0 ? 'aspect-[4/3] md:aspect-[16/9]' : 'aspect-square'}`}>
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-400" />

                  {/* Gold border reveal */}
                  <div className="absolute inset-0 border-0 group-hover:border-2 border-brand-gold/40 transition-all duration-400" />

                  {/* Shimmer line */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gold-gradient scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-start justify-end p-5 md:p-8">
                    <motion.span
                      className="text-3xl mb-2 group-hover:scale-110 inline-block transition-transform duration-300"
                    >
                      {cat.icon}
                    </motion.span>
                    <p className="font-body text-[10px] tracking-widest text-brand-gold-2/70 uppercase mb-1">{cat.count} Products</p>
                    <h3 className={`font-heading font-bold text-brand-cream group-hover:text-brand-gold-3 transition-colors duration-300 ${i === 0 ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
                      {cat.label}
                    </h3>
                    <p className="font-body text-xs text-brand-cream/50 mt-1 hidden md:block">{cat.description}</p>
                    <div className="flex items-center gap-1 mt-3 text-brand-gold-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="font-body text-xs font-semibold tracking-wider uppercase">Shop Now</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
