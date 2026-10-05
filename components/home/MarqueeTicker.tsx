'use client'
import { useLang } from '@/lib/lang'

export default function MarqueeTicker() {
  const { lang } = useLang()
  const items = lang === 'ZH'
    ? [
        '👑 100% 真人发假发',
        '✨ 优质真人发束',
        '💎 定制假发',
        '🌿 发品护理',
        '💄 美妆产品',
        '🧥 精品外套',
        '🏠 家用电器',
        '🍳 厨具用品',
        '🧼 清洁用品',
        '🛏️ 床上用品',
        '🔌 电子产品',
        '✈️ 发往全非洲',
        '🔒 正品保证',
      ]
    : [
        '👑 100% Human Hair Wigs',
        '✨ Virgin Hair Bundles',
        '💎 Custom Made Wigs',
        '🌿 Hair Maintenance',
        '💄 Beauty Products',
        '🧥 Luxury Coats',
        '🏠 Home Appliances',
        '🍳 Kitchenware',
        '🧼 Cleaning Products',
        '🛏️ Bedding',
        '🔌 Electronics',
        '✈️ Ships Across Africa',
        '🔒 Authentic & Guaranteed',
        '⭐ 4.9/5 Rated',
      ]
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
