'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plane, Clock, MapPin, Package } from 'lucide-react'

export default function ShippingBanner() {
  return (
    <section className="py-12 sm:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0500 0%, #1A0E00 50%, #0A0500 100%)' }}>
      {/* Gold glow */}
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
            ✦ Worldwide Delivery ✦
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title text-brand-cream"
          >
            From <span className="gold-text">China</span> to Your Door
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="font-body text-brand-cream/50 mt-3 max-w-2xl mx-auto"
          >
            We partner directly with manufacturers in Guangzhou — the heart of the global hair industry — to bring you unbeatable quality at fair prices, shipped straight to Nigeria and Ghana.
          </motion.p>
        </div>

        {/* Shipping route visual */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
          {[
            { icon: Package, label: 'Order Placed', sub: 'Quality checked & packed' },
            null,
            { icon: Plane, label: 'Ships from Guangzhou', sub: 'Direct flight to West Africa' },
            null,
            { icon: MapPin, label: 'Arrives at Your Door', sub: 'Lagos, Abuja, Accra & more' },
          ].map((item, i) =>
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

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Delivery Time',    value: '7–14 days',   icon: '🕐' },
            { label: 'Shipping Origin',  value: 'Guangzhou',   icon: '📦' },
            { label: 'Destinations',     value: 'NG & Ghana',  icon: '🌍' },
            { label: 'Free Shipping',    value: 'Orders $200+',icon: '✈️' },
          ].map(item => (
            <div key={item.label} className="gold-border-rounded p-4 text-center bg-brand-black-3/50">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-heading text-base font-bold text-brand-gold-3">{item.value}</p>
              <p className="font-body text-xs text-brand-cream/40 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/shop" className="btn-gold inline-flex items-center gap-2 text-base px-6 sm:px-12 py-4">
            Shop & Ship Now ✈️
          </Link>
        </div>
      </div>
    </section>
  )
}
