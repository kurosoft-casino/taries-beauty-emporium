'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

const KEY = 'taries-cookie-consent'

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function accept() {
    localStorage.setItem(KEY, 'accepted')
    setShow(false)
  }

  function decline() {
    localStorage.setItem(KEY, 'declined')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-[9999] p-3 sm:p-4"
        >
          <div className="max-w-4xl mx-auto bg-brand-black-2 border border-brand-gold/25 shadow-gold-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Cookie className="text-brand-gold-2 shrink-0 w-5 h-5 mt-0.5 sm:mt-0" />
            <p className="font-body text-sm text-brand-cream/70 flex-1">
              We use cookies to personalise content, remember your cart, and improve your experience.
              By continuing you agree to our{' '}
              <Link href="/privacy" className="text-brand-gold-3 underline underline-offset-2 hover:text-brand-gold">Privacy Policy</Link>.
            </p>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={accept}
                className="flex-1 sm:flex-none btn-gold px-5 py-2 text-xs font-semibold"
              >
                Accept All
              </button>
              <button
                onClick={decline}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-semibold border border-brand-gold/20 text-brand-cream/60 hover:text-brand-cream hover:border-brand-gold/40 transition-colors"
              >
                Decline
              </button>
              <button onClick={decline} className="text-brand-cream/30 hover:text-brand-cream/60 transition-colors p-1">
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
