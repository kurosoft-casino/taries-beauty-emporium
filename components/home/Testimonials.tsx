'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { testimonials } from '@/lib/products'
import { useLang } from '@/lib/lang'

export default function Testimonials() {
  const [active, setActive] = useState(0)
  const { lang } = useLang()
  const visible = 3
  const total = testimonials.length

  const prev = () => setActive(a => (a - 1 + total) % total)
  const next = () => setActive(a => (a + 1) % total)

  const visibleTestimonials = [
    testimonials[active % total],
    testimonials[(active + 1) % total],
    testimonials[(active + 2) % total],
  ]

  return (
    <section className="py-16 sm:py-24 bg-brand-black relative overflow-hidden">
      <div className="orb orb-gold w-80 h-80 top-10 left-10 opacity-10 pointer-events-none" />
      <div className="orb orb-amber w-60 h-60 bottom-10 right-10 opacity-10 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-14"
        >
          <p className="section-label">{lang === 'ZH' ? '✦ 真实顾客，真实评价 ✦' : '✦ Real Queens, Real Reviews ✦'}</p>
          <h2 className="section-title text-brand-cream">
            {lang === 'ZH' ? <>顾客 <span className="gold-text">怎么说</span></> : <>What Our <span className="gold-text">Customers Say</span></>}
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <AnimatePresence mode="popLayout">
            {visibleTestimonials.map((t, i) => (
              <motion.div
                key={`${active}-${i}`}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`gold-border-rounded p-6 bg-brand-black-2 hover:bg-brand-black-3 transition-colors duration-300 ${i === 1 ? 'md:-translate-y-4' : ''}`}
              >
                <Quote size={28} className="text-brand-gold/30 mb-4" />
                <p className="font-body text-sm text-brand-cream/70 leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center font-heading text-sm font-bold text-brand-black">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-heading text-sm font-semibold text-brand-cream">{t.name}</p>
                      <p className="font-body text-[11px] text-brand-cream/40">{t.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex justify-end mb-1">
                      {Array(5).fill(null).map((_, j) => (
                        <Star key={j} size={12} className="fill-brand-gold-2 text-brand-gold-2" />
                      ))}
                    </div>
                    <p className="font-body text-[10px] text-brand-cream/30">{t.date}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={prev} className="w-10 h-10 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`transition-all duration-300 rounded-full ${active === i ? 'w-6 h-2 bg-gold-gradient' : 'w-2 h-2 bg-brand-gold/30'}`}
              />
            ))}
          </div>
          <button onClick={next} className="w-10 h-10 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Overall rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-col items-center gap-2 px-4 sm:px-8 py-4 sm:py-5 bg-brand-black-2 border border-brand-gold/20">
            <div className="flex gap-1">
              {Array(5).fill(null).map((_, i) => (
                <Star key={i} size={20} className="fill-brand-gold-2 text-brand-gold-2" />
              ))}
            </div>
            <p className="font-heading text-3xl font-bold gold-text">4.9 / 5.0</p>
            <p className="font-body text-sm text-brand-cream/50">{lang === 'ZH' ? '基于 1,200+ 条真实顾客评价' : 'Based on 1,200+ verified customer reviews'}</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
