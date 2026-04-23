'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

const stats = [
  { value: 12000, label: 'Happy Customers', suffix: '+', icon: '👑' },
  { value: 4.9,   label: 'Average Rating',  suffix: '/5', icon: '⭐', decimal: 1 },
  { value: 98,    label: 'Authentic Hair',   suffix: '%', icon: '💯' },
  { value: 7,     label: 'Days Min Delivery', suffix: '', icon: '✈️', prefix: '' },
]

function CountUp({ target, decimal = 0, duration = 2000 }: { target: number; decimal?: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(parseFloat(start.toFixed(decimal)))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, decimal, duration])

  return <span ref={ref}>{count.toLocaleString(undefined, { minimumFractionDigits: decimal, maximumFractionDigits: decimal })}</span>
}

export default function StatsSection() {
  return (
    <section className="py-12 sm:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #0A0A0A 100%)' }}>
      {/* Gold divider lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gold-gradient opacity-50" />

      {/* Background crest pattern */}
      <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full border-2 border-brand-gold" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-14"
        >
          <p className="section-label">✦ By The Numbers ✦</p>
          <h2 className="section-title text-brand-cream">
            Trusted by <span className="gold-text">Thousands</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="text-center group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
                className="text-4xl mb-3 inline-block"
              >
                {stat.icon}
              </motion.div>
              <div className="font-display text-3xl sm:text-4xl md:text-5xl font-bold gold-text-animate mb-2">
                {stat.prefix}
                <CountUp target={stat.value} decimal={stat.decimal} />
                {stat.suffix}
              </div>
              <p className="font-body text-sm text-brand-cream/50 tracking-wide">{stat.label}</p>
              <div className="mt-3 h-px w-12 bg-gold-gradient mx-auto opacity-60 group-hover:w-full transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
