'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Copy, CheckCheck } from 'lucide-react'

export default function FirstTimeBuyerBanner() {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Only show once, not on first render — wait 6 seconds
    const seen = localStorage.getItem('taries-welcome-seen')
    if (seen) return
    const t = setTimeout(() => setVisible(true), 6000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    localStorage.setItem('taries-welcome-seen', '1')
    setVisible(false)
  }

  function copyCode() {
    navigator.clipboard.writeText('WELCOME15').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md"
        >
          <div className="relative bg-brand-black-2 border border-brand-gold/50 shadow-gold-xl p-5">
            {/* gold top bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gold-gradient" />

            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-brand-cream/40 hover:text-brand-cream transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center shrink-0">
                <Gift size={18} className="text-brand-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-bold text-brand-cream mb-0.5">
                  Welcome! Here&apos;s 15% off your first order 🎉
                </p>
                <p className="font-body text-xs text-brand-cream/50 mb-3">
                  Use the code below at checkout. One use per customer.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-brand-black border border-brand-gold/30 px-3 py-2 font-mono text-sm font-bold text-brand-gold-2 tracking-widest text-center">
                    WELCOME15
                  </div>
                  <button
                    onClick={copyCode}
                    className="shrink-0 w-10 h-9 flex items-center justify-center bg-gold-gradient text-brand-black hover:opacity-90 transition-opacity"
                  >
                    {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                {copied && (
                  <p className="font-body text-[10px] text-green-400 mt-1.5">Copied! Add to cart and paste at checkout.</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a href="/shop" onClick={dismiss} className="flex-1 btn-gold text-center py-2 text-xs font-semibold">
                Shop Now
              </a>
              <button onClick={dismiss} className="font-body text-xs text-brand-cream/40 hover:text-brand-cream/70 transition-colors px-3">
                No thanks
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
