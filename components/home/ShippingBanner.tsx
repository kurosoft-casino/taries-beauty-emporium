'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plane, MapPin, Package } from 'lucide-react'
import { useLang } from '@/lib/lang'

export default function ShippingBanner() {
  const { lang } = useLang()
  const copy = lang === 'ZH'
    ? {
        eyebrow: '✦ 全球配送 ✦',
        titleStart: '从',
        titleAccent: '中国',
        titleEnd: '送到您家门口',
        subtitle: '我们直接与广州制造商合作，将高品质与合理价格带给您，并直接发货到尼日利亚和加纳。',
        route: [
          { icon: Package, label: '订单已确认', sub: '质检并包装完成' },
          null,
          { icon: Plane, label: '从广州发货', sub: '直飞西非' },
          null,
          { icon: MapPin, label: '送达您家门口', sub: '拉各斯、阿布贾、阿克拉等地' },
        ],
        stats: [
          { label: '配送时效', value: '7–14 天', icon: '🕐' },
          { label: '发货地', value: '广州', icon: '📦' },
          { label: '目的地', value: '尼日利亚与加纳', icon: '🌍' },
          { label: '免运费', value: '$200+ 订单', icon: '✈️' },
        ],
        cta: '立即选购并发货 ✈️',
      }
    : {
        eyebrow: '✦ Worldwide Delivery ✦',
        titleStart: 'From',
        titleAccent: 'China',
        titleEnd: 'to Your Door',
        subtitle: 'We partner directly with manufacturers in Guangzhou — the heart of the global hair industry — to bring you unbeatable quality at fair prices, shipped straight to Nigeria and Ghana.',
        route: [
          { icon: Package, label: 'Order Placed', sub: 'Quality checked & packed' },
          null,
          { icon: Plane, label: 'Ships from Guangzhou', sub: 'Direct flight to West Africa' },
          null,
          { icon: MapPin, label: 'Arrives at Your Door', sub: 'Lagos, Abuja, Accra & more' },
        ],
        stats: [
          { label: 'Delivery Time', value: '7–14 days', icon: '🕐' },
          { label: 'Shipping Origin', value: 'Guangzhou', icon: '📦' },
          { label: 'Destinations', value: 'NG & Ghana', icon: '🌍' },
          { label: 'Free Shipping', value: 'Orders $200+', icon: '✈️' },
        ],
        cta: 'Shop & Ship Now ✈️',
      }

  return (
    <section className="py-12 sm:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0500 0%, #1A0E00 50%, #0A0500 100%)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gold-gradient opacity-60" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-label"
          >
            {copy.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title text-brand-cream"
          >
            {copy.titleStart} <span className="gold-text">{copy.titleAccent}</span> {copy.titleEnd}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="font-body text-brand-cream/50 mt-3 max-w-2xl mx-auto"
          >
            {copy.subtitle}
          </motion.p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
          {copy.route.map((item, i) =>
            item === null ? (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="hidden md:block flex-1 h-px bg-gold-gradient max-w-24 origin-left"
              />
            ) : (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-full bg-gold-gradient flex items-center justify-center mb-3 shadow-gold">
                  <item.icon size={22} className="text-brand-black" />
                </div>
                <p className="font-heading text-sm font-semibold text-brand-cream">{item.label}</p>
                <p className="font-body text-xs text-brand-cream/40 mt-1">{item.sub}</p>
              </motion.div>
            )
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {copy.stats.map(item => (
            <div key={item.label} className="gold-border-rounded p-4 text-center bg-brand-black-3/50">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-heading text-base font-bold text-brand-gold-3">{item.value}</p>
              <p className="font-body text-xs text-brand-cream/40 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/shop" className="btn-gold inline-flex items-center gap-2 text-base px-6 sm:px-12 py-4">
            {copy.cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
