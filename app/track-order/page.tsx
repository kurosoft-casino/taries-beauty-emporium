'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Search, Package, Truck, CheckCircle, Clock, MapPin, ShoppingBag, ArrowLeft } from 'lucide-react'
import { getOrder, formatOrderDate } from '@/lib/orders'
import type { Order } from '@/lib/orders'
import { formatPrice } from '@/lib/products'

const STATUS_STEPS: { key: Order['status']; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'pending',    label: 'Order Placed',  icon: Clock,         desc: 'Your order has been received and is awaiting confirmation.' },
  { key: 'processing', label: 'Processing',    icon: Package,       desc: 'Your order is being prepared and packaged in Guangzhou.' },
  { key: 'shipped',    label: 'Shipped',       icon: Truck,         desc: 'Your order has been dispatched via air freight.' },
  { key: 'delivered',  label: 'Delivered',     icon: CheckCircle,   desc: 'Your order has been delivered successfully.' },
]

const STATUS_ORDER: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered']

function getStepIndex(status: Order['status']): number {
  return STATUS_ORDER.indexOf(status)
}

function addBusinessDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<Order | null | 'not-found' | 'email-mismatch'>(null)
  const [loading, setLoading] = useState(false)

  function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      try {
        const order = getOrder(orderId.trim().toUpperCase())
        if (!order) {
          setResult('not-found')
        } else if (order.customer.email.toLowerCase() !== email.trim().toLowerCase()) {
          setResult('email-mismatch')
        } else {
          setResult(order)
        }
      } catch {
        setResult('not-found')
      }
      setLoading(false)
    }, 600)
  }

  const order = result && result !== 'not-found' && result !== 'email-mismatch' ? result : null
  const currentIdx = order ? getStepIndex(order.status) : -1

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="section-label">Order Tracking</p>
          <h1 className="font-display text-4xl font-bold gold-text mb-3">Track Your Order</h1>
          <p className="font-body text-brand-cream/50 text-sm">Enter your Order ID and email to see real-time status</p>
        </motion.div>

        {/* Search Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleTrack}
          className="bg-brand-black-2 border border-brand-gold/20 p-6 mb-8 space-y-4"
        >
          <div>
            <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Order ID</label>
            <input
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="e.g. TBE-000001"
              required
              className="w-full bg-brand-black-3 border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
            />
          </div>
          <div>
            <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your order email address"
              required
              className="w-full bg-brand-black-3 border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full flex items-center justify-center gap-2 py-3.5"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-brand-black/30 border-t-brand-black animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {loading ? 'Searching…' : 'Track Order'}
          </button>
        </motion.form>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result === 'not-found' && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center p-8 bg-brand-black-2 border border-red-500/20"
            >
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-heading text-lg text-brand-cream mb-2">Order Not Found</h3>
              <p className="font-body text-sm text-brand-cream/50">
                We couldn't find an order matching <strong className="text-brand-gold-2">{orderId}</strong>.
                Please check your Order ID and email address.
              </p>
              <p className="font-body text-xs text-brand-cream/30 mt-3">
                Orders are stored on the device used to place the order.
              </p>
            </motion.div>
          )}

          {result === 'email-mismatch' && (
            <motion.div
              key="mismatch"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center p-8 bg-brand-black-2 border border-red-500/20"
            >
              <div className="text-4xl mb-3">✉️</div>
              <h3 className="font-heading text-lg text-brand-cream mb-2">Email Doesn't Match</h3>
              <p className="font-body text-sm text-brand-cream/50">
                The email address doesn't match the order. Please use the exact email you provided at checkout.
              </p>
            </motion.div>
          )}

          {order && (
            <motion.div
              key="order"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Order Header */}
              <div className="bg-brand-black-2 border border-brand-gold/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-body text-xs text-brand-gold-2/70 tracking-widest uppercase">Order</p>
                    <p className="font-heading text-xl font-bold gold-text">{order.orderId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-xs text-brand-cream/50">Placed on</p>
                    <p className="font-body text-sm text-brand-cream">{formatOrderDate(order.date)}</p>
                  </div>
                </div>
                <div className="p-3 bg-brand-black-3 border border-brand-gold/10 text-sm font-body text-brand-cream/60 flex items-center gap-2">
                  <Clock size={13} className="text-brand-gold-2 shrink-0" />
                  Estimated delivery: <strong className="text-brand-cream">
                    {addBusinessDays(order.date, 7)} – {addBusinessDays(order.date, 14)}
                  </strong>
                  <span className="ml-auto text-xs text-brand-cream/30">(7–14 business days)</span>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-brand-black-2 border border-brand-gold/20 p-5">
                <h3 className="font-heading text-base font-semibold text-brand-cream mb-5">Order Timeline</h3>
                <div className="space-y-0">
                  {STATUS_STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentIdx
                    const isCurrent = idx === currentIdx
                    const Icon = step.icon
                    return (
                      <div key={step.key} className="flex gap-4">
                        {/* Connector */}
                        <div className="flex flex-col items-center">
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.12 }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                              isCurrent
                                ? 'bg-gold-gradient shadow-gold-xl'
                                : isCompleted
                                ? 'bg-brand-gold/20 border border-brand-gold/40'
                                : 'bg-brand-black-3 border border-brand-gold/10'
                            }`}
                          >
                            <Icon size={15} className={
                              isCurrent ? 'text-brand-black' :
                              isCompleted ? 'text-brand-gold-2' :
                              'text-brand-cream/20'
                            } />
                          </motion.div>
                          {idx < STATUS_STEPS.length - 1 && (
                            <div className={`w-0.5 flex-1 my-1 min-h-[24px] transition-all duration-500 ${
                              idx < currentIdx ? 'bg-brand-gold/40' : 'bg-brand-gold/10'
                            }`} />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 pb-5">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`font-heading text-sm font-semibold transition-colors ${
                              isCurrent ? 'text-brand-gold-3' :
                              isCompleted ? 'text-brand-cream' :
                              'text-brand-cream/25'
                            }`}>
                              {step.label}
                            </p>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-body bg-brand-gold/15 text-brand-gold-2 border border-brand-gold/30 rounded-full tracking-wider uppercase">
                                Current
                              </span>
                            )}
                          </div>
                          <p className={`font-body text-xs transition-colors ${
                            isCompleted ? 'text-brand-cream/50' : 'text-brand-cream/20'
                          }`}>
                            {step.desc}
                          </p>
                          {step.key === 'pending' && (
                            <p className="font-body text-xs text-brand-cream/30 mt-0.5">
                              {formatOrderDate(order.date)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Items */}
              <div className="bg-brand-black-2 border border-brand-gold/20 p-5">
                <h3 className="font-heading text-base font-semibold text-brand-cream mb-4 flex items-center gap-2">
                  <ShoppingBag size={15} className="text-brand-gold-2" /> Order Items
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <motion.div
                      key={`${item.product.id}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 py-2 border-b border-brand-gold/5 last:border-0"
                    >
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover shrink-0"
                      />
                      <div className="flex-1">
                        <p className="font-body text-sm text-brand-cream leading-snug">{item.product.name}</p>
                        <p className="font-body text-xs text-brand-cream/40">
                          Qty: {item.quantity}
                          {Object.keys(item.selectedVariants ?? {}).length > 0 && (
                            <> · {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}</>
                          )}
                        </p>
                      </div>
                      <p className="font-heading text-sm font-semibold text-brand-gold-2">
                        {formatPrice(item.product.price * item.quantity, order.currency)}
                      </p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-brand-gold/10 flex justify-between font-heading text-sm font-bold">
                  <span className="text-brand-cream">Grand Total</span>
                  <span className="gold-text">{formatPrice(order.grandTotalUSD, order.currency)}</span>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-brand-black-2 border border-brand-gold/20 p-5">
                <h3 className="font-heading text-base font-semibold text-brand-cream mb-3 flex items-center gap-2">
                  <MapPin size={15} className="text-brand-gold-2" /> Shipping Address
                </h3>
                <p className="font-body text-sm text-brand-cream">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="font-body text-sm text-brand-cream/60 mt-1">{order.shipping.address}</p>
                <p className="font-body text-sm text-brand-cream/60">
                  {order.shipping.city}, {order.shipping.state}
                </p>
                <p className="font-body text-sm text-brand-cream/60">{order.shipping.country}</p>
              </div>

              {/* Gift Message if present */}
              {order.giftMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-brand-black-2 border border-brand-gold/20 p-5"
                >
                  <h3 className="font-heading text-base font-semibold text-brand-cream mb-3">🎁 Gift Message</h3>
                  <p className="font-body text-sm text-brand-cream/70 italic">"{order.giftMessage}"</p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href={`/invoice?orderId=${order.orderId}`} className="btn-gold flex items-center gap-2">
                  📄 View Invoice
                </Link>
                <a
                  href={`https://wa.me/2349035412919?text=Hi! I'd like to enquire about order ${order.orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline-gold flex items-center gap-2"
                >
                  💬 WhatsApp Support
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-4"
          >
            <Link href="/shop" className="font-body text-sm text-brand-cream/30 hover:text-brand-gold-2 transition-colors flex items-center gap-1.5 justify-center">
              <ArrowLeft size={14} /> Back to Shop
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
