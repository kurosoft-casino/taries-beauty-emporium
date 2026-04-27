'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, ShoppingBag, Sparkles, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrice, products } from '@/lib/products'
import { useLang } from '@/lib/lang'
import { useCartStore } from '@/lib/store'

interface FeaturedProductsProps {
  title?: string
  subtitle?: string
  filter?: (p: typeof products[0]) => boolean
  limit?: number
  viewAllHref?: string
}

const badgeStyles: Record<NonNullable<(typeof products)[0]['badge']>, { className: string; EN: string; ZH: string }> = {
  new: { className: 'bg-[#f4dc96] text-brand-black', EN: 'New', ZH: '新品' },
  sale: { className: 'bg-[#6c1735] text-white', EN: 'Sale', ZH: '促销' },
  hot: { className: 'bg-[#d8b54e] text-brand-black', EN: 'Hot', ZH: '热门' },
  bestseller: { className: 'bg-[#c9960c] text-brand-black', EN: 'Best', ZH: '爆款' },
}

function renderTitle(title: string) {
  const words = title.trim().split(/\s+/)
  if (words.length <= 1) return <span className="gold-text">{title}</span>

  return (
    <>
      {words.slice(0, -1).join(' ')} <span className="gold-text">{words.at(-1)}</span>
    </>
  )
}

export default function FeaturedProducts({
  title = 'Featured Products',
  subtitle = 'Handpicked luxury pieces for every queen',
  filter = (p) => !!p.badge,
  limit = 8,
  viewAllHref = '/shop',
}: FeaturedProductsProps) {
  const showcased = products.filter(filter).slice(0, limit)
  const spotlight = showcased[0]
  const secondary = showcased.slice(1, 4)
  const gridProducts = showcased.slice(4)

  const { lang, t } = useLang()
  const { addItem, openCart, currency } = useCartStore()

  function handleAddToCart(product: typeof products[0]) {
    if (!product.inStock) {
      toast.error(lang === 'ZH' ? '该商品已缺货' : 'This item is currently out of stock')
      return
    }

    addItem(product)
    toast.success(lang === 'ZH' ? '已加入购物车' : `${product.name.split(' ').slice(0, 3).join(' ')} added to cart`)
    openCart()
  }

  if (!spotlight) return null

  return (
    <section className="relative overflow-hidden border-y border-brand-gold/20 bg-brand-black py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(760px 340px at 8% -5%, rgba(212,175,55,0.16), transparent 72%), radial-gradient(620px 300px at 92% 12%, rgba(212,175,55,0.08), transparent 68%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-label"
            >
              {lang === 'ZH' ? 'Taries 推荐' : 'Taries Selection'}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              viewport={{ once: true }}
              className="section-title text-brand-cream"
            >
              {renderTitle(title)}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.12 }}
              viewport={{ once: true }}
              className="mt-2 max-w-2xl font-body text-sm text-brand-cream/55 sm:text-base"
            >
              {subtitle}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link href={viewAllHref} className="btn-outline-gold inline-flex items-center gap-2">
              {t('viewAll')} <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="group relative overflow-hidden border border-brand-gold/30 bg-[#0f0f0f]"
          >
            <Link href={`/product/${spotlight.slug}`} className="block">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={spotlight.images[0]}
                  alt={spotlight.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

                {spotlight.badge && (
                  <span
                    className={`absolute left-4 top-4 z-10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${badgeStyles[spotlight.badge].className}`}
                  >
                    {badgeStyles[spotlight.badge][lang]}
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-brand-gold-2/80">{spotlight.categoryLabel}</p>
                  <h3 className="mt-2 font-heading text-2xl text-brand-cream sm:text-4xl">{spotlight.name}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-brand-cream/70">{spotlight.shortDesc}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="font-heading text-3xl font-bold text-brand-gold-3">
                      {formatPrice(spotlight.price, currency)}
                    </span>
                    {spotlight.originalPrice && (
                      <span className="text-sm text-brand-cream/45 line-through">
                        {formatPrice(spotlight.originalPrice, currency)}
                      </span>
                    )}
                    <span className={`text-xs font-semibold ${spotlight.inStock ? 'text-green-300' : 'text-red-300'}`}>
                      {spotlight.inStock ? (lang === 'ZH' ? '有库存' : 'In stock') : (lang === 'ZH' ? '缺货' : 'Out of stock')}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-3 border-t border-brand-gold/20 bg-brand-black/80 px-5 py-4 sm:px-7">
              <button
                onClick={() => handleAddToCart(spotlight)}
                className="btn-gold inline-flex items-center gap-2 px-6 py-2.5 text-xs"
              >
                <ShoppingBag size={14} />
                {lang === 'ZH' ? '加入购物车' : 'Add to Cart'}
              </button>
              <Link
                href={`/product/${spotlight.slug}`}
                className="inline-flex items-center gap-2 border border-brand-gold/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold-2 transition-colors hover:text-brand-gold-3"
              >
                {lang === 'ZH' ? '查看详情' : 'View Details'}
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.article>

          <div className="grid gap-4 sm:gap-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-3 gap-3 border border-brand-gold/20 bg-brand-black-2 px-4 py-3 sm:px-5"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-cream/40">{lang === 'ZH' ? '已展示' : 'Shown'}</p>
                <p className="font-heading text-2xl text-brand-gold-3">{showcased.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-cream/40">{lang === 'ZH' ? '在售' : 'In Stock'}</p>
                <p className="font-heading text-2xl text-brand-gold-3">{showcased.filter(product => product.inStock).length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-cream/40">{lang === 'ZH' ? '平均评分' : 'Avg Rate'}</p>
                <p className="inline-flex items-center gap-1 font-heading text-2xl text-brand-gold-3">
                  <Star size={14} className="fill-brand-gold text-brand-gold" />
                  {(showcased.reduce((sum, product) => sum + product.rating, 0) / showcased.length).toFixed(1)}
                </p>
              </div>
            </motion.div>

            {secondary.map((product, index) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.05 }}
                viewport={{ once: true, margin: '-60px' }}
                className="group flex gap-3 border border-brand-gold/20 bg-brand-black-2 p-3 transition-colors hover:border-brand-gold/45"
              >
                <Link href={`/product/${product.slug}`} className="relative block h-28 w-24 shrink-0 overflow-hidden sm:h-32 sm:w-28">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="112px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold-2/70">{product.categoryLabel}</p>
                  <Link href={`/product/${product.slug}`}>
                    <h3 className="mt-1 line-clamp-2 font-heading text-xl text-brand-cream transition-colors group-hover:text-brand-gold-3">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-heading text-2xl text-brand-gold-3">{formatPrice(product.price, currency)}</span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="inline-flex items-center gap-2 bg-gold-gradient px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-black transition-opacity hover:opacity-90"
                    >
                      <ShoppingBag size={12} />
                      {lang === 'ZH' ? '加入' : 'Add'}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {gridProducts.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gridProducts.map((product, index) => (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.04 }}
                viewport={{ once: true, margin: '-40px' }}
                className="group overflow-hidden border border-brand-gold/20 bg-brand-black-2 transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/50"
              >
                <Link href={`/product/${product.slug}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  </div>
                </Link>

                <div className="p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-brand-gold-2/70">
                    <Sparkles size={12} />
                    {product.categoryLabel}
                  </div>
                  <Link href={`/product/${product.slug}`}>
                    <h3 className="line-clamp-2 font-heading text-xl text-brand-cream transition-colors group-hover:text-brand-gold-3">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-heading text-2xl text-brand-gold-3">{formatPrice(product.price, currency)}</span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="inline-flex items-center gap-1 border border-brand-gold/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-gold-2 transition-colors hover:border-brand-gold hover:text-brand-gold-3"
                    >
                      <ShoppingBag size={12} />
                      {lang === 'ZH' ? '加入' : 'Add'}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
