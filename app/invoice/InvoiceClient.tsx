'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Printer, Download, ArrowLeft, CheckCircle, Clock, Package } from 'lucide-react'
import { getOrder, formatOrderDate, paymentMethodLabel } from '@/lib/orders'
import type { Order } from '@/lib/orders'
import { formatPrice, EXCHANGE_RATES } from '@/lib/products'
import { getCurrentUser } from '@/lib/auth'
import { normalizeEmail } from '@/lib/validation'
import { SITE_URL, withApiBase, withBasePath } from '@/lib/site'

const STATUS_MAP = {
  pending:    { label: 'Pending',     color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  processing: { label: 'Processing',  color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30' },
  shipped:    { label: 'Shipped',      color: 'text-brand-gold-3', bg: 'bg-brand-gold/10 border-brand-gold/30' },
  delivered:  { label: 'Delivered',    color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30' },
}
const PAY_STATUS = {
  pending: { label: 'AWAITING PAYMENT', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  paid:    { label: 'PAID',             color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30' },
}

export default function InvoiceClient() {
  const params = useSearchParams()
  const orderId = params.get('orderId')
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [unlockEmail, setUnlockEmail] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const invoiceRef = useRef<HTMLDivElement>(null)

  async function fetchRemoteInvoice(email: string): Promise<Order | null> {
    if (!orderId) return null
    const query = new URLSearchParams({ email: normalizeEmail(email) })
    const remotePath = withApiBase(`/orders/${encodeURIComponent(orderId)}?${query.toString()}`)
    const endpoint = remotePath.startsWith('/orders/') ? `/api/orders/${encodeURIComponent(orderId)}?${query.toString()}` : remotePath
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.ok || !payload?.order) return null
    return payload.order as Order
  }

  useEffect(() => {
    async function run() {
      if (!orderId) {
        setNotFound(true)
        return
      }
      const local = getOrder(orderId)
      if (local) {
        setOrder(local)
        const currentUser = getCurrentUser()
        const allowed = currentUser?.email.toLowerCase() === local.customer.email.toLowerCase()
        const sessionEmail = sessionStorage.getItem(`taries-invoice-access-${local.orderId}`)
        setUnlocked(allowed || sessionEmail?.toLowerCase() === local.customer.email.toLowerCase())
        return
      }

      const currentUser = getCurrentUser()
      const sessionEmail = sessionStorage.getItem(`taries-invoice-access-${orderId}`) || ''
      const emailCandidates = [currentUser?.email || '', sessionEmail].map(normalizeEmail).filter(Boolean)
      for (const email of emailCandidates) {
        const remote = await fetchRemoteInvoice(email)
        if (remote) {
          setOrder(remote)
          setUnlocked(true)
          return
        }
      }
      setOrder(null)
      setUnlocked(false)
      setNotFound(false)
    }

    void run()
  }, [orderId])

  function handlePrint() {
    window.print()
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="font-heading text-2xl text-brand-cream mb-2">Invoice Not Found</h1>
          <p className="font-body text-sm text-brand-cream/60 mb-6">
            We couldn't find order <strong className="text-brand-gold-2">{orderId}</strong>.
          </p>
          <Link href="/shop" className="btn-gold">Back to Shop</Link>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-brand-black-2 border border-brand-gold/20 p-6">
          <p className="section-label mb-2">Lookup Invoice</p>
          <h1 className="font-display text-3xl gold-text mb-3">Find Your Invoice</h1>
          <p className="font-body text-sm text-brand-cream/60 mb-5">
            Enter the same email used at checkout for order <strong className="text-brand-gold-2">{orderId}</strong>.
          </p>
          <form
            onSubmit={async event => {
              event.preventDefault()
              const email = normalizeEmail(unlockEmail)
              if (!email) {
                setUnlockError('Please enter a valid email address.')
                return
              }
              setUnlockError('')
              setLookupLoading(true)
              try {
                const remote = await fetchRemoteInvoice(email)
                if (!remote) {
                  setUnlockError('Order not found for this email.')
                  return
                }
                setOrder(remote)
                sessionStorage.setItem(`taries-invoice-access-${remote.orderId}`, email)
                setUnlocked(true)
              } finally {
                setLookupLoading(false)
              }
            }}
            className="space-y-4"
          >
            <input
              type="email"
              value={unlockEmail}
              onChange={event => { setUnlockEmail(event.target.value); setUnlockError('') }}
              placeholder="you@example.com"
              className="w-full bg-brand-black-3 border border-brand-gold/20 px-4 py-3 text-brand-cream focus:outline-none focus:border-brand-gold/50"
            />
            {unlockError && <p className="text-red-400 text-xs">{unlockError}</p>}
            <button type="submit" disabled={lookupLoading} className="btn-gold w-full disabled:opacity-60">
              {lookupLoading ? 'Looking up…' : 'Find Invoice'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-brand-black-2 border border-brand-gold/20 p-6">
          <p className="section-label mb-2">Protected Invoice</p>
          <h1 className="font-display text-3xl gold-text mb-3">Confirm Your Email</h1>
          <p className="font-body text-sm text-brand-cream/60 mb-5">
            To view invoice <strong className="text-brand-gold-2">{order.orderId}</strong>, enter the same email used at checkout.
          </p>
          <form
            onSubmit={async event => {
              event.preventDefault()
              const email = normalizeEmail(unlockEmail)
              if (!email) {
                setUnlockError('Please enter a valid email address.')
                return
              }
              setLookupLoading(true)
              setUnlockError('')
              try {
                const remote = await fetchRemoteInvoice(email)
                if (!remote || email !== remote.customer.email.toLowerCase()) {
                  setUnlockError('That email does not match this order.')
                  return
                }
                setOrder(remote)
                sessionStorage.setItem(`taries-invoice-access-${remote.orderId}`, email)
                setUnlocked(true)
              } finally {
                setLookupLoading(false)
              }
            }}
            className="space-y-4"
          >
            <input
              type="email"
              value={unlockEmail}
              onChange={event => { setUnlockEmail(event.target.value); setUnlockError('') }}
              placeholder="you@example.com"
              className="w-full bg-brand-black-3 border border-brand-gold/20 px-4 py-3 text-brand-cream focus:outline-none focus:border-brand-gold/50"
            />
            {unlockError && <p className="text-red-400 text-xs">{unlockError}</p>}
            <button type="submit" disabled={lookupLoading} className="btn-gold w-full disabled:opacity-60">
              {lookupLoading ? 'Checking…' : 'Unlock Invoice'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const subtotal  = order.subtotalUSD
  const shipping  = order.shippingUSD
  const discount = order.discountUSD ?? 0
  const grandTotal = order.grandTotalUSD
  const cur = order.currency

  return (
    <div className="min-h-screen bg-brand-black/95 py-10 px-4 print:bg-white print:py-0">

      {/* Action Bar — hidden on print */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-body text-sm text-brand-cream/60 hover:text-brand-gold-2 transition-colors">
          <ArrowLeft size={16} /> Back to Store
        </Link>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="btn-gold flex items-center gap-2 text-sm py-2 px-5"
          >
            <Printer size={15} /> Print Invoice
          </button>
          <button
            onClick={handlePrint}
            className="btn-outline-gold flex items-center gap-2 text-sm py-2 px-5"
          >
            <Download size={15} /> Save as PDF
          </button>
        </div>
      </div>

      {/* Invoice Paper */}
      <motion.div
        ref={invoiceRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-[#0D0D0D] print:bg-white border border-brand-gold/20 print:border-0 shadow-[0_0_80px_rgba(212,175,55,0.08)] print:shadow-none"
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-brand-gold/20 print:border-gray-200">
          {/* Gold top accent bar */}
          <div className="h-1.5 w-full bg-gold-gradient print:bg-yellow-500" />

          <div className="px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={withBasePath('/images/logo.jpg')}
                  alt="Taries Beauty Emporium"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold gold-text print:text-yellow-700 leading-tight tracking-wide">
                  TARIES BEAUTY
                </h1>
                <p className="font-body text-[9px] tracking-[0.45em] text-brand-gold-2 print:text-yellow-600 uppercase">Emporium</p>
                <p className="font-body text-xs text-brand-cream/40 print:text-gray-500 mt-1">Guangzhou, China  ·  Ships to NG & GH</p>
              </div>
            </div>

            {/* INVOICE title + number */}
            <div className="text-right">
              <div className="font-display text-5xl font-bold gold-text print:text-yellow-700 tracking-widest mb-2">
                INVOICE
              </div>
              <p className="font-body text-sm text-brand-gold-2 print:text-yellow-600 font-semibold tracking-widest">
                #{order.orderId}
              </p>
              <p className="font-body text-xs text-brand-cream/40 print:text-gray-500 mt-1">
                Date: {formatOrderDate(order.date)}
              </p>
            </div>
          </div>
        </div>

        {/* ── STATUS PILLS ──────────────────────────────────────────── */}
        <div className="px-8 py-4 flex flex-wrap gap-3 border-b border-brand-gold/10 print:border-gray-100 bg-brand-black-2/40 print:bg-gray-50">
          {/* Order Status */}
          <span className={`inline-flex items-center gap-1.5 font-body text-xs font-semibold tracking-widest uppercase px-3 py-1.5 border rounded-full ${STATUS_MAP[order.status].bg} ${STATUS_MAP[order.status].color}`}>
            <Package size={11} /> {STATUS_MAP[order.status].label}
          </span>
          {/* Payment Status */}
          <span className={`inline-flex items-center gap-1.5 font-body text-xs font-semibold tracking-widest uppercase px-3 py-1.5 border rounded-full ${PAY_STATUS[order.paymentStatus].bg} ${PAY_STATUS[order.paymentStatus].color}`}>
            {order.paymentStatus === 'paid'
              ? <CheckCircle size={11} />
              : <Clock size={11} />
            }
            {PAY_STATUS[order.paymentStatus].label}
          </span>
          <span className="inline-flex items-center gap-1.5 font-body text-xs text-brand-cream/40 print:text-gray-400 px-3 py-1.5 border border-brand-gold/10 print:border-gray-200 rounded-full">
            💳 {paymentMethodLabel(order.paymentMethod)}
          </span>
        </div>

        {/* ── BILL TO / SHIP TO ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-brand-gold/10 print:border-gray-200">
          <div className="px-8 py-6 sm:border-r border-brand-gold/10 print:border-gray-200">
            <p className="font-body text-[10px] tracking-[0.35em] text-brand-gold-2 print:text-yellow-600 uppercase mb-3">Bill To</p>
            <p className="font-heading text-base text-brand-cream print:text-gray-900 font-semibold">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="font-body text-sm text-brand-cream/60 print:text-gray-500 mt-1">{order.customer.email}</p>
            <p className="font-body text-sm text-brand-cream/60 print:text-gray-500">{order.customer.phone}</p>
          </div>
          <div className="px-8 py-6">
            <p className="font-body text-[10px] tracking-[0.35em] text-brand-gold-2 print:text-yellow-600 uppercase mb-3">Ship To</p>
            <p className="font-heading text-base text-brand-cream print:text-gray-900 font-semibold">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="font-body text-sm text-brand-cream/60 print:text-gray-500 mt-1">{order.shipping.address}</p>
            <p className="font-body text-sm text-brand-cream/60 print:text-gray-500">
              {order.shipping.city}, {order.shipping.state}
            </p>
            <p className="font-body text-sm text-brand-cream/60 print:text-gray-500">{order.shipping.country}</p>
            {order.shipping.postalCode && (
              <p className="font-body text-sm text-brand-cream/60 print:text-gray-500">Postcode: {order.shipping.postalCode}</p>
            )}
          </div>
        </div>

        {/* ── ITEMS TABLE ───────────────────────────────────────────── */}
        <div className="px-8 py-6">
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-brand-gold/20 print:border-gray-300">
                  <th className="text-left py-3 pr-4 font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase">
                    #
                  </th>
                  <th className="text-left py-3 pr-4 font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase">
                    Item
                  </th>
                  <th className="text-left py-3 pr-4 font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-center py-3 pr-4 font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase">
                    Qty
                  </th>
                  <th className="text-right py-3 pr-4 font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase">
                    Unit Price
                  </th>
                  <th className="text-right py-3 font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr
                    key={`${item.product.id}-${idx}`}
                    className="border-b border-brand-gold/5 print:border-gray-100 hover:bg-brand-gold/3 transition-colors"
                  >
                    <td className="py-4 pr-4 text-brand-cream/30 print:text-gray-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-10 h-10 object-cover rounded shrink-0 print:hidden"
                        />
                        <div>
                          <p className="text-brand-cream print:text-gray-900 font-medium leading-snug">
                            {item.product.name}
                          </p>
                          {Object.entries(item.selectedVariants ?? {}).length > 0 && (
                            <p className="text-xs text-brand-cream/40 print:text-gray-400 mt-0.5">
                              {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-brand-cream/50 print:text-gray-400 hidden sm:table-cell text-xs">
                      {item.product.categoryLabel}
                    </td>
                    <td className="py-4 pr-4 text-center text-brand-cream/70 print:text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="py-4 pr-4 text-right text-brand-cream/70 print:text-gray-700">
                      {formatPrice(item.product.price, cur)}
                    </td>
                    <td className="py-4 text-right font-semibold text-brand-cream print:text-gray-900">
                      {formatPrice(item.product.price * item.quantity, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TOTALS ────────────────────────────────────────────────── */}
        <div className="px-8 pb-8 flex flex-col sm:flex-row sm:justify-end">
          <div className="w-full sm:w-72 space-y-2">
            <div className="flex justify-between font-body text-sm py-2 border-b border-brand-gold/10 print:border-gray-100">
              <span className="text-brand-cream/60 print:text-gray-500">Subtotal</span>
              <span className="text-brand-cream print:text-gray-800">{formatPrice(subtotal, cur)}</span>
            </div>
            <div className="flex justify-between font-body text-sm py-2 border-b border-brand-gold/10 print:border-gray-100">
              <span className="text-brand-cream/60 print:text-gray-500">International Shipping</span>
              <span className={shipping === 0 ? 'text-green-400' : 'text-brand-cream print:text-gray-800'}>
                {shipping === 0 ? 'FREE ✈️' : formatPrice(shipping, cur)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-body text-sm py-2 border-b border-brand-gold/10 print:border-gray-100">
                <span className="text-green-400">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span className="text-green-400">−{formatPrice(discount, cur)}</span>
              </div>
            )}
            {/* Grand Total */}
            <div className="flex justify-between items-center py-3 mt-1">
              <span className="font-heading text-base text-brand-cream print:text-gray-900 font-bold">Grand Total</span>
              <span className="font-heading text-xl font-bold gold-text print:text-yellow-700">
                {formatPrice(grandTotal, cur)}
              </span>
            </div>
            {/* USD equivalent if not USD */}
            {cur !== 'USD' && (
              <p className="font-body text-xs text-brand-cream/30 print:text-gray-400 text-right">
                ≈ ${grandTotal.toFixed(2)} USD
              </p>
            )}
          </div>
        </div>

        {/* ── NOTES ─────────────────────────────────────────────────── */}
        {order.notes && (
          <div className="px-8 pb-6">
            <div className="p-4 bg-brand-black-2 print:bg-gray-50 border border-brand-gold/10 print:border-gray-200 rounded">
              <p className="font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase mb-1">Order Notes</p>
              <p className="font-body text-sm text-brand-cream/60 print:text-gray-600">{order.notes}</p>
            </div>
          </div>
        )}

        {/* ── GIFT MESSAGE ──────────────────────────────────────────── */}
        {order.giftMessage && (
          <div className="px-8 pb-6">
            <div className="p-4 bg-brand-black-2 print:bg-gray-50 border border-brand-gold/20 print:border-yellow-200 rounded">
              <p className="font-body text-[10px] tracking-[0.3em] text-brand-gold-2 print:text-yellow-600 uppercase mb-1">🎁 Gift Message</p>
              <p className="font-body text-sm text-brand-cream/70 print:text-gray-700 italic">"{order.giftMessage}"</p>
            </div>
          </div>
        )}

        {/* ── PAYMENT NOTE (if transfer pending) ───────────────────── */}
        {order.paymentMethod === 'transfer' && order.paymentStatus === 'pending' && (
          <div className="px-8 pb-6">
            <div className="p-5 bg-yellow-400/5 border border-yellow-400/20 rounded">
              <p className="font-heading text-sm text-yellow-300 print:text-yellow-700 font-semibold mb-2">⚠️ Payment Pending</p>
              <p className="font-body text-xs text-brand-cream/60 print:text-gray-600 leading-relaxed">
                Please complete your bank transfer and use{' '}
                <strong className="text-brand-gold-2 print:text-yellow-700">{order.orderId}</strong>{' '}
                as the payment reference. Your order will be processed within 24 hours of payment confirmation.
              </p>
              <div className="mt-3 space-y-1">
                <p className="font-body text-xs text-brand-cream/70 print:text-gray-700">
                  Bank: <strong>Zenith Bank Nigeria / GCB Ghana</strong>
                </p>
                <p className="font-body text-xs text-brand-cream/70 print:text-gray-700">
                  Account Name: <strong>Taries Beauty Emporium</strong>
                </p>
                <p className="font-body text-xs text-brand-cream/70 print:text-gray-700">
                  Account No: <strong className="text-brand-gold-3 print:text-yellow-700">0123456789</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <div className="relative border-t border-brand-gold/20 print:border-gray-200 overflow-hidden">
          {/* Decorative orb */}
          <div className="orb orb-gold w-96 h-32 bottom-0 right-0 opacity-20 print:hidden" />

          <div className="px-8 py-7 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              {/* Thank you */}
              <div>
                <p className="font-heading text-base text-brand-cream print:text-gray-900 font-semibold mb-1">
                  Thank you for shopping with us! 💛
                </p>
                <p className="font-body text-xs text-brand-cream/50 print:text-gray-500 leading-relaxed">
                  Questions about your order? We are here to help.
                </p>
              </div>

              {/* Contact */}
              <div className="text-right space-y-1">
                <p className="font-body text-xs text-brand-gold-2 print:text-yellow-600">
                  💬 wa.me/2349035412919
                </p>
                <p className="font-body text-xs text-brand-cream/50 print:text-gray-500">
                  📧 tariesbeautye@gmail.com
                </p>
                <p className="font-body text-xs text-brand-cream/40 print:text-gray-400">
                  {SITE_URL.replace(/^https?:\/\//, '')}
                </p>
              </div>
            </div>

            {/* Bottom strip */}
            <div className="mt-5 pt-4 border-t border-brand-gold/10 print:border-gray-100 flex items-center justify-between">
              <p className="font-body text-[10px] text-brand-cream/25 print:text-gray-400 tracking-wider">
                © {new Date().getFullYear()} Taries Beauty Emporium · All Rights Reserved
              </p>
              <p className="font-body text-[10px] text-brand-cream/25 print:text-gray-400 tracking-wider uppercase">
                Invoice #{order.orderId}
              </p>
            </div>
          </div>

          {/* Bottom gold accent */}
          <div className="h-1 w-full bg-gold-gradient print:bg-yellow-500" />
        </div>
      </motion.div>

      {/* Share / actions footer — hidden on print */}
      <div className="no-print max-w-4xl mx-auto mt-8 text-center space-y-3">
        <p className="font-body text-xs text-brand-cream/30">
          💡 Use <strong>Save as PDF</strong> in your browser&apos;s print dialog to save a copy of this invoice.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href={`https://wa.me/2349035412919?text=Hi! I'd like to enquire about my order ${order.orderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-gold text-sm py-2 px-5 flex items-center gap-2"
          >
            💬 WhatsApp Support
          </a>
          <Link href="/shop" className="btn-gold text-sm py-2 px-5">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
