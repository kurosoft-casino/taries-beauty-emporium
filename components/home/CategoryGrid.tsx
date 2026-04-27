'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Star } from 'lucide-react'
import { categories } from '@/lib/products'
import { getCategoryCopy, useLang } from '@/lib/lang'

const categoryCopy = {
  EN: {
    eyebrow: 'Collection Navigator',
    titleStart: 'Choose Your',
    titleAccent: 'Next Obsession',
    products: 'Products',
    cta: 'Shop Category',
    preview: 'Preview',
    quickTitle: 'Quick Access',
    totalCategories: 'Categories',
  },
  ZH: {
    eyebrow: '系列导航',
    titleStart: '挑选你的',
    titleAccent: '下一个心动款',
    products: '件商品',
    cta: '进入分类',
    preview: '预览',
    quickTitle: '快速入口',
    totalCategories: '分类',
  },
} as const

export default function CategoryGrid() {
  const { lang } = useLang()
  const copy = categoryCopy[lang]

  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '')

  const activeCategory = useMemo(
    () => categories.find(category => category.id === activeCategoryId) ?? categories[0],
    [activeCategoryId]
  )

  const localizedActive = getCategoryCopy(activeCategory.id, lang)

  return (
    <section className="relative overflow-hidden border-y border-brand-gold/20 bg-brand-black py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(840px 300px at 10% 8%, rgba(212,175,55,0.14), transparent 72%), radial-gradient(700px 320px at 92% 88%, rgba(212,175,55,0.08), transparent 68%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-label"
            >
              {copy.eyebrow}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              viewport={{ once: true }}
              className="section-title text-brand-cream"
            >
              {copy.titleStart} <span className="gold-text">{copy.titleAccent}</span>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="border border-brand-gold/20 bg-brand-black-2 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-brand-cream/40">{copy.totalCategories}</p>
              <p className="font-heading text-2xl text-brand-gold-3">{categories.length}</p>
            </div>
            <div className="border border-brand-gold/20 bg-brand-black-2 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-brand-cream/40">{copy.products}</p>
              <p className="font-heading text-2xl text-brand-gold-3">{categories.reduce((sum, category) => sum + category.count, 0)}</p>
            </div>
          </motion.div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <motion.article
            key={activeCategory.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            className="group overflow-hidden border border-brand-gold/30 bg-brand-black-2"
          >
            <Link href={`/shop?category=${activeCategory.id}`} className="block">
              <div className="relative aspect-[5/4] overflow-hidden sm:aspect-[16/10]">
                <Image
                  src={activeCategory.image}
                  alt={localizedActive?.label ?? activeCategory.label}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 border border-brand-gold/30 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-lg leading-none">{activeCategory.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-gold-2">{copy.preview}</span>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-brand-gold-2/80">
                    {activeCategory.count} {copy.products}
                  </p>
                  <h3 className="mt-2 font-heading text-3xl text-brand-cream sm:text-5xl">
                    {localizedActive?.label ?? activeCategory.label}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-brand-cream/70 sm:text-base">
                    {localizedActive?.description ?? activeCategory.description}
                  </p>
                </div>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-3 border-t border-brand-gold/20 bg-brand-black/80 px-5 py-4 sm:px-7">
              <Link href={`/shop?category=${activeCategory.id}`} className="btn-gold inline-flex items-center gap-2 px-6 py-2.5 text-xs">
                {copy.cta}
                <ArrowRight size={14} />
              </Link>
              <span className="inline-flex items-center gap-1 text-xs text-brand-cream/60">
                <Star size={12} className="fill-brand-gold text-brand-gold" />
                {lang === 'ZH' ? '精选系列，持续上新' : 'Curated category, always updated'}
              </span>
            </div>
          </motion.article>

          <div className="space-y-3">
            {categories.map((category, index) => {
              const localized = getCategoryCopy(category.id, lang)
              const active = category.id === activeCategory.id

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  viewport={{ once: true, margin: '-50px' }}
                  className={`grid grid-cols-[1fr,auto] items-stretch border transition-colors ${
                    active ? 'border-brand-gold/55 bg-brand-black-2' : 'border-brand-gold/20 bg-brand-black/55 hover:border-brand-gold/40'
                  }`}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveCategoryId(category.id)}
                    onFocus={() => setActiveCategoryId(category.id)}
                    onClick={() => setActiveCategoryId(category.id)}
                    className="grid min-w-0 grid-cols-[64px,1fr] items-center gap-3 p-3 text-left"
                  >
                    <div className="relative h-16 w-16 overflow-hidden border border-brand-gold/20">
                      <Image
                        src={category.image}
                        alt={localized?.label ?? category.label}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-brand-gold-2/80">
                        {category.count} {copy.products}
                      </p>
                      <p className="truncate font-heading text-lg text-brand-cream">
                        {localized?.label ?? category.label}
                      </p>
                    </div>
                  </button>

                  <Link
                    href={`/shop?category=${category.id}`}
                    className="inline-flex items-center justify-center border-l border-brand-gold/20 px-4 text-brand-gold-2 transition-colors hover:text-brand-gold-3"
                    aria-label={`${copy.cta}: ${localized?.label ?? category.label}`}
                  >
                    <ArrowRight size={16} />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 border border-brand-gold/20 bg-brand-black-2 p-4 sm:p-5">
          <p className="mb-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-brand-gold-2/75">
            <Sparkles size={12} />
            {copy.quickTitle}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category, index) => {
              const localized = getCategoryCopy(category.id, lang)
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  viewport={{ once: true, margin: '-30px' }}
                >
                  <Link
                    href={`/shop?category=${category.id}`}
                    className="flex items-center justify-between border border-brand-gold/20 bg-brand-black px-3 py-2 text-xs text-brand-cream/80 transition-colors hover:border-brand-gold/45 hover:text-brand-gold-3"
                  >
                    <span className="truncate">{localized?.label ?? category.label}</span>
                    <span className="ml-2 shrink-0 text-brand-gold-2/70">{category.icon}</span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
