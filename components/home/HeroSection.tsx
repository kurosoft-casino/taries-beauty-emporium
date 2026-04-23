'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ArrowRight, Star, ChevronDown } from 'lucide-react'
import { logoSrc } from '@/lib/assets'

// Star particle component
function Stars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            '--duration': `${2 + Math.random() * 4}s`,
            '--delay': `${Math.random() * 4}s`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            opacity: Math.random() * 0.8,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// Floating orb
function Orbs() {
  return (
    <>
      <div className="orb orb-gold w-[600px] h-[600px] -top-32 -right-32 opacity-30" style={{ animationDelay: '0s' }} />
      <div className="orb orb-amber w-[400px] h-[400px] top-1/2 -left-20 opacity-20" style={{ animationDelay: '2s' }} />
      <div className="orb orb-gold w-[300px] h-[300px] bottom-0 right-1/3 opacity-15" style={{ animationDelay: '4s' }} />
    </>
  )
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '40%'])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const words = ['Premium.', 'Luxurious.', 'Authentic.', 'Yours.']

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-black">
      <Stars />
      <Orbs />

      {/* Decorative crest lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-brand-gold/5 animate-spin-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-brand-gold/8" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-brand-gold/5" />
      </div>

      <motion.div style={{ y, opacity }} className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Logo emblem */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-28 h-28 md:w-36 md:h-36">
            <div className="absolute inset-0 rounded-full animate-pulse-gold" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Taries Beauty Emporium"
              className="w-full h-full object-contain rounded-full drop-shadow-[0_0_40px_rgba(212,175,55,0.6)]"
            />
          </div>
        </motion.div>

        {/* Tag line */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="section-label text-center mb-4"
        >
          ✦ Luxury Hair & Beauty — Ships from China to Nigeria & Ghana ✦
        </motion.p>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-display text-5xl sm:text-6xl md:text-8xl font-bold leading-none mb-4"
        >
          <span className="block text-brand-cream mb-2">Where Beauty</span>
          <span className="gold-text-animate block">Meets Royalty</span>
        </motion.h1>

        {/* Rotating words */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="h-12 flex items-center justify-center mb-6 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {words.map((word, i) => (
              <motion.span
                key={word}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="font-heading text-2xl md:text-3xl text-brand-gold-2 absolute"
                style={{ display: 'none' }}
              />
            ))}
          </AnimatePresence>
          <RotatingWord words={words} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="font-body text-lg text-brand-cream/60 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          100% authentic human hair wigs & bundles, custom-made with precision,
          shipped direct from our manufacturers in China to your door in Nigeria & Ghana.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <Link href="/shop" className="btn-gold flex items-center gap-2 text-base px-10 py-4">
            Shop The Collection <ArrowRight size={18} />
          </Link>
          <Link href="/custom-wigs" className="btn-outline-gold flex items-center gap-2 text-base px-10 py-4">
            Order Custom Wig ✨
          </Link>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex flex-wrap items-center justify-center gap-6 text-center"
        >
          {[
            { icon: '⭐', label: '4.9/5 Rating', sub: '1,200+ Reviews' },
            { icon: '🌍', label: 'Ships to NG & GH', sub: '7–14 Business Days' },
            { icon: '💎', label: '100% Human Hair', sub: 'Authenticity Guaranteed' },
            { icon: '🔒', label: 'Secure Checkout', sub: 'Paystack & Transfer' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xl">{item.icon}</span>
              <div className="text-left">
                <p className="font-body text-xs font-semibold text-brand-cream">{item.label}</p>
                <p className="font-body text-[10px] text-brand-cream/40">{item.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <p className="font-body text-[10px] tracking-widest text-brand-gold/50 uppercase">Scroll</p>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronDown size={20} className="text-brand-gold-2" />
        </motion.div>
      </motion.div>
    </section>
  )
}

function RotatingWord({ words }: { words: string[] }) {
  const [idx, setIdx] = useRotation(words.length, 2500)
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[idx]}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="font-heading text-2xl md:text-3xl gold-text"
      >
        {words[idx]}
      </motion.span>
    </AnimatePresence>
  )
}

function useRotation(max: number, interval: number): [number, React.Dispatch<React.SetStateAction<number>>] {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i: number) => (i + 1) % max), interval)
    return () => clearInterval(t)
  }, [max, interval])
  return [idx, setIdx]
}
