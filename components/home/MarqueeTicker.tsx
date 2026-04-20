'use client'
import { useEffect, useRef } from 'react'

const items = [
  '👑 100% Human Hair Wigs',
  '✨ Virgin Hair Bundles',
  '💎 Custom Made Wigs',
  '🌿 Hair Maintenance',
  '💄 Beauty Products',
  '🧥 Luxury Coats',
  '✈️ Ships to Nigeria & Ghana',
  '🔒 Authentic & Guaranteed',
  '⭐ 4.9/5 Rated',
]

export default function MarqueeTicker() {
  return (
    <div className="bg-brand-black-3 border-y border-brand-gold/20 py-4 overflow-hidden relative">
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #111111, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #111111, transparent)' }} />

      {/* Gold line top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gold-gradient" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gold-gradient" />

      <div
        className="flex items-center whitespace-nowrap gap-0"
        style={{ animation: 'marquee 30s linear infinite', width: 'max-content' }}
      >
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="font-body text-sm font-medium text-brand-gold-2 px-6 tracking-wide">{item}</span>
            <span className="text-brand-gold/30">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
