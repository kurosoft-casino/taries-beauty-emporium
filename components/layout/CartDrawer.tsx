'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/products'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotalUSD, currency, getTotalItems } = useCartStore()
  const total = getTotalUSD()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col"
            style={{ background: '#111111', borderLeft: '1px solid rgba(212,175,55,0.2)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-brand-gold/20">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-brand-gold-2" />
                <h2 className="font-heading text-xl font-semibold text-brand-cream">
                  Your Cart <span className="text-brand-gold-2 text-base">({getTotalItems()})</span>
                </h2>
              </div>
              <button onClick={closeCart} className="text-brand-cream/60 hover:text-brand-gold-3 transition-colors p-1">
                <X size={22} />
              </button>
            </div>

            {/* Shipping notice */}
            {total < 200 && total > 0 && (
              <div className="px-6 py-3 bg-brand-gold/10 border-b border-brand-gold/20">
                <p className="font-body text-xs text-brand-gold-2 text-center">
                  Add <strong className="text-brand-gold-3">{formatPrice(200 - total, currency)}</strong> more for FREE shipping! 🎉
                </p>
                <div className="mt-2 h-1 bg-brand-black-3 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gold-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((total / 200) * 100, 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto py-4 px-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-64 gap-4 text-center"
                  >
                    <ShoppingBag size={48} className="text-brand-gold/30" />
                    <div>
                      <p className="font-heading text-lg text-brand-cream/60 mb-1">Your cart is empty</p>
                      <p className="font-body text-sm text-brand-cream/40">Discover our luxury collection</p>
                    </div>
                    <button onClick={closeCart} className="btn-outline-gold mt-2">
                      Shop Now
                    </button>
                  </motion.div>
                ) : (
                  items.map(item => (
                    <motion.div
                      key={`${item.product.id}-${JSON.stringify(item.selectedVariants)}`}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      className="flex gap-4 p-4 bg-brand-black-3 rounded border border-brand-gold/10 hover:border-brand-gold/30 transition-colors"
                    >
                      <div className="relative w-20 h-20 rounded shrink-0 overflow-hidden">
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-semibold text-brand-cream line-clamp-2 mb-1">{item.product.name}</p>
                        {Object.entries(item.selectedVariants).length > 0 && (
                          <p className="font-body text-xs text-brand-gold-2/70 mb-2">
                            {Object.values(item.selectedVariants).join(' · ')}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariants)}
                              className="w-7 h-7 rounded border border-brand-gold/30 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-body text-sm font-semibold text-brand-cream w-5 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariants)}
                              className="w-7 h-7 rounded border border-brand-gold/30 flex items-center justify-center text-brand-gold-2 hover:bg-brand-gold/10 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <p className="font-heading text-sm font-bold text-brand-gold-2">
                            {formatPrice(item.product.price * item.quantity, currency)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, item.selectedVariants)}
                        className="text-brand-cream/30 hover:text-red-400 transition-colors shrink-0 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-brand-gold/20 px-6 py-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-body text-sm text-brand-cream/60">Subtotal</span>
                  <span className="font-heading text-xl font-bold text-brand-gold-3">{formatPrice(total, currency)}</span>
                </div>
                <p className="font-body text-xs text-brand-cream/40 text-center">Taxes & shipping calculated at checkout</p>
                <Link href="/checkout" onClick={closeCart} className="btn-gold w-full flex items-center justify-center gap-2">
                  Checkout <ArrowRight size={16} />
                </Link>
                <Link href="/cart" onClick={closeCart} className="btn-outline-gold w-full flex items-center justify-center gap-2 text-center">
                  View Cart
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
