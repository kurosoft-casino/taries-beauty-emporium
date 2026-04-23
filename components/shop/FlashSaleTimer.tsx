'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function getSecondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return { h: pad(h), m: pad(m), s: pad(s) }
}

function DigitBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-12 h-10 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center bg-brand-black border border-brand-gold/30 font-heading text-lg font-bold text-brand-gold-3"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="font-body text-[9px] text-brand-gold/50 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  )
}

export default function FlashSaleTimer() {
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    setSeconds(getSecondsUntilMidnight())
    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev === null) return getSecondsUntilMidnight()
        if (prev <= 1) return getSecondsUntilMidnight()
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (seconds === null) return null

  const { h, m, s } = formatTime(seconds)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center flex-wrap gap-3 px-5 py-3 bg-brand-black-3 border border-brand-gold/20 mb-6"
    >
      <span className="font-body text-xs tracking-widest text-brand-gold-2 uppercase shrink-0">
        ⚡ Flash Sale Ends In
      </span>
      <div className="flex items-end gap-1">
        <DigitBlock value={h} label="HRS" />
        <span className="font-heading text-xl text-brand-gold/50 mb-4">:</span>
        <DigitBlock value={m} label="MIN" />
        <span className="font-heading text-xl text-brand-gold/50 mb-4">:</span>
        <DigitBlock value={s} label="SEC" />
      </div>
    </motion.div>
  )
}
