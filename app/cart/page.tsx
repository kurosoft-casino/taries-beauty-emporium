'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, CheckCircle, X, Plane, Tag } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/products'
import { estimateWeight, calcShipping, getCargoType } from '@/lib/shipping'
import AlsoBought from '@/components/shop/AlsoBought'

interface Coupon {
  discount: number         // fraction, e.g. 0.10 = 10%
  label: string
  categoryOnly?: string[]  // if set, only applies to these categories
}

const COUPONS: Record<string, Coupon> = {
  BEAUTY10:  { discount: 0.10, label: '10% off' },
  WELCOME15: { discount: 0.15, label: '15% off' },
  HAIR20:    { discount: 0.20, label: '20% off on wigs & bundles', categoryOnly: ['wigs', 'bundles'] },
  TARIES25:  { discount: 0.25, label: '25% off (VIP)' },
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalUSD, currency, clearCart } = useCartStore()

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; coupon: Coupon } | null>(null)
  const [couponError, setCouponError] = useState('')

  const total = getTotalUSD()
  const cargoType = getCargoType(items)
  const weightKg = estimateWeight(items)
  const shippingCalc = calcShipping(weightKg, cargoType)
  const shipping = items.length > 0 ? shippingCalc.totalUsdEquiv : 0

  // Coupon discount calculation
  function calcDiscount(coupon: Coupon): number {
    if (!coupon.categoryOnly) return total * coupon.discount
    const eligible = items.reduce((sum, i) => {
      if (coupon.categoryOnly!.includes(i.product.category)) {
        return sum + i.product.price * i.quantity
      }
      return sum
    }, 0)
    return eligible * coupon.discount
  }

  const discount = appliedCoupon ? calcDiscount(appliedCoupon.coupon) : 0
  const discountedSubtotal = total - discount
  const grandTotal = discountedSubtotal + shipping

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (COUPONS[code]) {
      setAppliedCoupon({ code, coupon: COUPONS[code] })
      setCouponError('')
    } else {
      setCouponError("Invalid code. Try BEAUTY10 for 10% off!")
      setAppliedCoupon(null)
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError('')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-black pt-32 pb-20 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <ShoppingBag size={64} className="text-brand-gold/30 mx-auto mb-6" />
          <h1 className="font-heading text-3xl text-brand-cream mb-2">Your cart is empty</h1>
          <p className="font-body text-brand-cream/50 mb-8">Discover our luxury collection and treat yourself</p>
          <Link href="/shop" className="btn-gold inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Continue Shopping
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold text-brand-cream">
            Your <span className="gold-text">Cart</span>
          </motion.h1>
          <p className="font-body text-brand-cream/50 mt-1">{items.reduce((s, i) => s + i.quantity, 0)} items</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map(item => (
                <motion.div
                  key={`${item.product.id}-${JSON.stringify(item.selectedVariants)}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  className="flex gap-5 p-5 bg-brand-black-2 border border-brand-gold/10 hover:border-brand-gold/25 transition-colors"
                >
                  <div className="relative w-24 h-28 shrink-0 overflow-hidden">
                    <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" sizes="96px" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-body text-[10px] tracking-widest text-brand-gold-2/70 uppercase mb-1">{item.product.categoryLabel}</p>
                        <Link href={`/product/${item.product.slug}`} className="font-heading text-base font-semibold text-brand-cream hover:text-brand-gold-3 transition-colors">
                          {item.product.name}
                        </Link>
                        {Object.keys(item.selectedVariants).length > 0 && (
                          <p className="font-body text-xs text-brand-gold-2/60 mt-1">
                            {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        )}
                        <p className="font-body text-[10px] text-brand-cream/30 mt-1">✈️ {item.product.deliveryDays}</p>
                      </div>
                      <button onClick={() => removeItem(item.product.id, item.selectedVariants)} className="text-brand-cream/30 hover:text-red-400 transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-brand-gold/20">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariants)} className="w-9 h-9 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10">
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center font-body text-sm text-brand-cream">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariants)} className="w-9 h-9 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10">
                          <Plus size={13} />
                        </button>
                      </div>
                      <p className="font-heading text-lg font-bold text-brand-gold-3">
                        {formatPrice(item.product.price * item.quantity, currency)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex gap-3 pt-2">
              <Link href="/shop" className="btn-outline-gold flex items-center gap-2">
                <ArrowLeft size={16} /> Continue Shopping
              </Link>
              <button onClick={clearCart} className="font-body text-xs text-brand-cream/30 hover:text-red-400 transition-colors ml-auto">
                Clear Cart
              </button>
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-brand-black-2 border border-brand-gold/20 p-6 sticky top-28">
              <h2 className="font-heading text-xl font-semibold text-brand-cream mb-5 pb-4 border-b border-brand-gold/20">Order Summary</h2>

              {/* Coupon code */}
              <div className="mb-5">
                <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2 flex items-center gap-1.5">
                  <Tag size={11} /> Coupon Code
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-400 shrink-0" />
                      <span className="font-body text-xs text-green-400">
                        ✓ <strong>{appliedCoupon.code}</strong> applied — {appliedCoupon.coupon.label}!
                      </span>
                    </div>
                    <button onClick={removeCoupon} className="text-brand-cream/40 hover:text-red-400 transition-colors ml-2">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder="Enter code..."
                      className="flex-1 bg-brand-black-3 border border-brand-gold/20 text-brand-cream font-body text-sm px-3 py-2 focus:outline-none focus:border-brand-gold-2 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                    />
                    <button
                      onClick={applyCoupon}
                      className="px-3 py-2 bg-brand-gold/15 border border-brand-gold/30 text-brand-gold-2 font-body text-sm font-semibold hover:bg-brand-gold/25 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                )}
                <AnimatePresence>
                  {couponError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="font-body text-xs text-red-400 mt-1.5"
                    >
                      {couponError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between font-body text-sm">
                  <span className="text-brand-cream/60">Subtotal</span>
                  {discount > 0 ? (
                    <div className="text-right">
                      <span className="text-brand-cream/40 line-through text-xs mr-1">{formatPrice(total, currency)}</span>
                      <span className="text-green-400">{formatPrice(discountedSubtotal, currency)}</span>
                    </div>
                  ) : (
                    <span className="text-brand-cream">{formatPrice(total, currency)}</span>
                  )}
                </div>
                {discount > 0 && (
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-green-400/80">Discount ({appliedCoupon!.coupon.label})</span>
                    <span className="text-green-400">−{formatPrice(discount, currency)}</span>
                  </div>
                )}

                {/* Real shipping breakdown */}
                <div className="p-3 bg-brand-black-3 border border-brand-gold/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Plane size={11} className="text-brand-gold-2" />
                    <span className="font-body text-xs text-brand-gold-2 font-semibold">Shipping from Guangzhou</span>
                  </div>
                  <p className="font-body text-[11px] text-brand-cream/45">
                    ~{weightKg.toFixed(1)} kg · {cargoType === 'sensitive' ? 'Sensitive goods' : 'General cargo'}
                  </p>
                  <p className="font-body text-[11px] text-brand-cream/45">
                    ${shippingCalc.usd.toFixed(2)} + ₦{shippingCalc.ngn.toLocaleString()}
                  </p>
                  <div className="flex justify-between font-body text-sm pt-1 border-t border-brand-gold/10">
                    <span className="text-brand-cream/60">Shipping</span>
                    <span className="text-brand-cream">{formatPrice(shipping, currency)}</span>
                  </div>
                </div>

                <div className="flex justify-between font-heading text-base font-bold pt-3 border-t border-brand-gold/20">
                  <span className="text-brand-cream">Total</span>
                  <span className="gold-text">{formatPrice(grandTotal, currency)}</span>
                </div>
              </div>

              <Link href="/checkout" className="btn-gold w-full flex items-center justify-center gap-2 mb-3">
                Proceed to Checkout <ArrowRight size={16} />
              </Link>

              <a
                href={`https://wa.me/2349035412919?text=I'd like to order: ${items.map(i => `${i.product.name} x${i.quantity}`).join(', ')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all font-body text-sm font-semibold"
              >
                💬 Order via WhatsApp
              </a>

              <div className="mt-5 space-y-2">
                {['🔒 SSL Secured Checkout', '✈️ Ships from Guangzhou, China', '💯 100% Authentic Products'].map(t => (
                  <p key={t} className="font-body text-[11px] text-brand-cream/30 flex items-center gap-2">{t}</p>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      {/* Customers Also Bought */}
      {(() => {
        const counts: Record<string, number> = {}
        items.forEach(item => { counts[item.product.category] = (counts[item.product.category] ?? 0) + item.quantity })
        const topCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
        return topCategory ? <AlsoBought currentSlug="" currentCategory={topCategory} /> : null
      })()}
    </div>
  )
}
