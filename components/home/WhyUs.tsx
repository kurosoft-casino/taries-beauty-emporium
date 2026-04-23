'use client'
import { motion } from 'framer-motion'
import { Truck, Shield, Headphones, RotateCcw, Award, Globe } from 'lucide-react'

const features = [
  {
    icon: Truck,
    title: 'Direct from Manufacturers',
    desc: 'We source directly from our partner factories in Guangzhou, China — cutting out middlemen so you get luxury quality at fair prices.',
  },
  {
    icon: Shield,
    title: '100% Authenticity Guaranteed',
    desc: 'Every single product is certified authentic. No synthetic blends, no fillers — pure human hair, premium beauty, real luxury.',
  },
  {
    icon: Globe,
    title: 'Ships to Nigeria & Ghana',
    desc: 'Fast, reliable delivery direct to your door in Lagos, Abuja, Accra, Kumasi and everywhere in between. 7–14 business days.',
  },
  {
    icon: Headphones,
    title: 'WhatsApp Customer Support',
    desc: 'Our team is available via WhatsApp to answer every question — product advice, order tracking, customs support and more.',
  },
  {
    icon: Award,
    title: 'Premium Quality Standards',
    desc: 'Our quality control team inspects every order before it ships. We settle for nothing less than the standard we set for ourselves.',
  },
  {
    icon: RotateCcw,
    title: 'Hassle-Free Returns',
    desc: 'Not 100% happy? Our 14-day return policy has you covered. We believe in our products — and we stand behind them.',
  },
]

export default function WhyUs() {
  return (
    <section className="py-16 sm:py-24 bg-brand-black-2 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-40" />
      <div className="orb orb-gold w-80 h-80 bottom-0 left-0 opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-14"
        >
          <p className="section-label">✦ The Taries Difference ✦</p>
          <h2 className="section-title text-brand-cream">
            Why Queens Choose <span className="gold-text">Taries Beauty</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="gold-border-rounded p-5 sm:p-7 bg-brand-black group transition-all duration-300 hover:bg-brand-black-3"
            >
              <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <feat.icon size={20} className="text-brand-black" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-brand-cream mb-3 group-hover:text-brand-gold-3 transition-colors">{feat.title}</h3>
              <p className="font-body text-sm text-brand-cream/50 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
