'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { X, Sparkles } from 'lucide-react'
import { logoSrc } from '@/lib/assets'
import Image from 'next/image'
import { shouldHideEngagementUi } from '@/lib/engagementVisibility'

const SESSION_KEY = 'taries-exit-intent-shown'
const CODE = 'TARIES10'

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()
  const hidden = shouldHideEngagementUi(pathname)

  useEffect(() => {
    if (hidden) return
    if (sessionStorage.getItem(SESSION_KEY)) return

    // Desktop: mouse leaves top of viewport
    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) trigger()
    }

    // Mobile: show after 45 s of inactivity (no touch/scroll)
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(trigger, 45_000)
    }

    function trigger() {
      if (sessionStorage.getItem(SESSION_KEY)) return
      setShow(true)
      sessionStorage.setItem(SESSION_KEY, '1')
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('touchstart', resetTimer)
      document.removeEventListener('scroll', resetTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('touchstart', resetTimer, { passive: true })
    document.addEventListener('scroll', resetTimer, { passive: true })
    resetTimer()

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('touchstart', resetTimer)
      document.removeEventListener('scroll', resetTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [hidden])

  if (hidden) return null

  function close() { setShow(false) }

  function copyCode() {
    navigator.clipboard.writeText(CODE).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000]"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative bg-brand-black-2 border border-brand-gold/30 shadow-gold-xl max-w-md w-full pointer-events-auto overflow-hidden">
              {/* Gold top accent */}
              <div className="h-1 w-full bg-gold-gradient" />

              <button
                onClick={close}
                className="absolute top-3 right-3 text-brand-cream/30 hover:text-brand-cream/70 transition-colors z-10"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="p-6 sm:p-8 text-center">
                {/* Logo */}
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <Image src={logoSrc} alt="Taries Beauty" fill className="object-contain rounded-full" />
                </div>

                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Sparkles className="text-brand-gold-2 w-4 h-4" />
                  <span className="font-body text-xs tracking-[0.25em] uppercase text-brand-gold-2">Exclusive Offer</span>
                  <Sparkles className="text-brand-gold-2 w-4 h-4" />
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-brand-cream mb-2">
                  Wait — Don't Leave<br />
                  <span className="gold-text">Empty Handed!</span>
                </h2>
                <p className="font-body text-sm text-brand-cream/60 mb-6">
                  Get <span className="text-brand-gold-3 font-semibold">10% OFF</span> your first order.
                  Use the code below at checkout:
                </p>

                {/* Code block */}
                <button
                  onClick={copyCode}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-brand-black border-2 border-dashed border-brand-gold/50 hover:border-brand-gold transition-colors group mb-5"
                >
                  <span className="font-heading text-xl font-bold tracking-[0.2em] text-brand-gold-3 group-hover:text-brand-gold">
                    {CODE}
                  </span>
                  <span className="font-body text-xs text-brand-cream/50 group-hover:text-brand-gold/70 transition-colors">
                    {copied ? '✓ Copied!' : 'Tap to copy'}
                  </span>
                </button>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="/shop"
                    onClick={close}
                    className="flex-1 btn-gold py-3 text-sm font-semibold text-center"
                  >
                    Shop Now →
                  </a>
                  <button
                    onClick={close}
                    className="flex-1 py-3 text-sm font-body text-brand-cream/40 hover:text-brand-cream/60 transition-colors"
                  >
                    No thanks
                  </button>
                </div>

                <p className="font-body text-[10px] text-brand-cream/25 mt-4">
                  One-time use. Valid for first-time buyers only. Cannot be combined with other offers.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
