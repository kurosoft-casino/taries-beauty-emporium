'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Package, Eye, Store, Search,
  LogOut, Users, BarChart2, Lock,
} from 'lucide-react'
import { logoSrc } from '@/lib/assets'
import { getAllOrders, formatOrderDate } from '@/lib/orders'
import type { Order } from '@/lib/orders'
import { products } from '@/lib/products'
import { getViews } from '@/lib/views'

const ADMIN_PIN = '8520'

interface Vendor {
  id: string
  businessName: string
  ownerName: string
  email: string
  phone: string
  category: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  appliedAt: string
  feeStatus: 'unpaid' | 'paid'
}

// ── PIN Entry ────────────────────────────────────────────────────────────────
function PinEntry({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  function handleDigit(d: string) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        setTimeout(() => onSuccess(), 300)
      } else {
        setShake(true)
        setError(true)
        setTimeout(() => { setPin(''); setShake(false) }, 700)
      }
    }
  }

  function handleBack() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Image
            src={logoSrc}
            alt="Taries Beauty"
            width={72}
            height={72}
            unoptimized
            className="rounded-full mx-auto mb-4 border-2 border-brand-gold shadow-gold-xl"
          />
          <p className="section-label">Restricted Area</p>
          <h1 className="text-2xl font-display font-bold gold-text">Admin Access</h1>
        </div>

        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 shadow-gold-xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Lock className="w-5 h-5 text-brand-gold/60" />
            <motion.div
              animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-4"
            >
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length
                      ? error
                        ? 'bg-red-500 border-red-500'
                        : 'bg-brand-gold border-brand-gold'
                      : 'border-brand-gold/30 bg-transparent'
                  }`}
                />
              ))}
            </motion.div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-center text-sm mb-4"
              >
                Incorrect PIN. Please try again.
              </motion.p>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-3">
            {keys.map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d === '⌫') handleBack()
                  else if (d) handleDigit(d)
                }}
                disabled={d === ''}
                className={`py-4 rounded-xl text-xl font-semibold transition-all duration-150 ${
                  d === '⌫'
                    ? 'bg-brand-black-3 text-red-400 hover:bg-red-900/30 active:scale-95'
                    : d === ''
                    ? 'cursor-default'
                    : 'bg-brand-black-3 text-brand-cream hover:bg-brand-gold/20 hover:text-brand-gold active:scale-95 border border-brand-gold/10'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Status Pill ──────────────────────────────────────────────────────────────
function OrderStatusPill({ status }: { status: Order['status'] }) {
  const styles: Record<Order['status'], string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    shipped: 'bg-brand-gold/20 text-brand-gold border-brand-gold/30',
    delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    setOrders(getAllOrders())
  }, [])

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4 animate-pulse-gold">
          <Package className="w-8 h-8 text-brand-gold" />
        </div>
        <h3 className="text-brand-cream font-display text-xl mb-2">No Orders Yet</h3>
        <p className="text-brand-cream/40 text-sm">Orders will appear here once customers start purchasing.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-brand-gold/20">
            {['Order ID', 'Date', 'Customer', 'Items', 'Grand Total', 'Status', 'Payment'].map(h => (
              <th key={h} className="text-left py-3 px-4 text-brand-gold/60 font-medium text-xs uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <motion.tr
              key={o.orderId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border-b border-brand-gold/10 hover:bg-brand-gold/5 transition-colors"
            >
              <td className="py-3 px-4 text-brand-gold font-mono text-xs">{o.orderId}</td>
              <td className="py-3 px-4 text-brand-cream/60 text-xs">{formatOrderDate(o.date)}</td>
              <td className="py-3 px-4 text-brand-cream font-medium">{o.customer.firstName} {o.customer.lastName}</td>
              <td className="py-3 px-4 text-brand-cream/60 text-center">
                {o.items.reduce((a, it) => a + it.quantity, 0)}
              </td>
              <td className="py-3 px-4 text-brand-gold font-semibold">${o.grandTotalUSD.toFixed(2)}</td>
              <td className="py-3 px-4"><OrderStatusPill status={o.status} /></td>
              <td className="py-3 px-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  o.paymentStatus === 'paid'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }`}>
                  {o.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Products & Views Tab ─────────────────────────────────────────────────────
function ProductsTab() {
  const [views, setViews] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    setViews(getViews())
  }, [])

  const sorted = [...products]
    .sort((a, b) => (views[b.slug] ?? 0) - (views[a.slug] ?? 0))
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryLabel.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div>
      <div className="mb-5 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold/40" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products or categories…"
          className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl pl-10 pr-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/25 focus:outline-none focus:border-brand-gold/50 transition-colors"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-brand-gold/20">
              {['Product', 'Category', 'Price', 'Views'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-brand-gold/60 font-medium text-xs uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                className="border-b border-brand-gold/10 hover:bg-brand-gold/5 transition-colors"
              >
                <td className="py-3 px-4 text-brand-cream font-medium">{p.name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-xs border border-brand-gold/20 text-brand-gold/70">
                    {p.categoryLabel}
                  </span>
                </td>
                <td className="py-3 px-4 text-brand-gold font-semibold">${p.price}</td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1.5 text-brand-cream/60">
                    <Eye className="w-3.5 h-3.5 text-brand-gold" />
                    {views[p.slug] ?? 0} views
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Vendors Tab ──────────────────────────────────────────────────────────────
function VendorsTab() {
  const [vendors, setVendors] = useState<Vendor[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('taries-vendors')
      if (raw) setVendors(JSON.parse(raw))
    } catch {}
  }, [])

  function updateStatus(id: string, status: 'approved' | 'rejected') {
    setVendors(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, status } : v)
      try { localStorage.setItem('taries-vendors', JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const total = vendors.length
  const pending = vendors.filter(v => v.status === 'pending').length
  const approved = vendors.filter(v => v.status === 'approved').length

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Vendors', value: total, color: 'text-brand-gold' },
          { label: 'Pending Review', value: pending, color: 'text-yellow-400' },
          { label: 'Approved', value: approved, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-brand-black-3 border border-brand-gold/20 rounded-xl p-4 text-center">
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-brand-cream/40 text-xs mt-1 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-brand-gold/20 mb-4" />
          <h3 className="text-brand-cream font-display text-lg mb-2">No Vendor Applications</h3>
          <p className="text-brand-cream/40 text-sm">Applications submitted via the vendor registration page will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-brand-gold/20">
                {['Business', 'Owner', 'Category', 'Applied', 'Fee', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-brand-gold/60 font-medium text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => (
                <motion.tr
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-brand-gold/10 hover:bg-brand-gold/5 transition-colors"
                >
                  <td className="py-3 px-4 text-brand-cream font-semibold">{v.businessName}</td>
                  <td className="py-3 px-4 text-brand-cream/70">{v.ownerName}</td>
                  <td className="py-3 px-4 text-brand-cream/60 text-xs">{v.category}</td>
                  <td className="py-3 px-4 text-brand-cream/50 text-xs">
                    {new Date(v.appliedAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      v.feeStatus === 'paid'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {v.feeStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      v.status === 'approved'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : v.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {v.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(v.id, 'approved')}
                          className="px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium hover:bg-green-500/25 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(v.id, 'rejected')}
                          className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/25 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [tab, setTab] = useState<'orders' | 'products' | 'vendors'>('orders')

  const tabs = [
    { id: 'orders'   as const, label: 'Orders',           icon: Package  },
    { id: 'products' as const, label: 'Products & Views', icon: BarChart2 },
    { id: 'vendors'  as const, label: 'Vendors',          icon: Store    },
  ]

  if (!authenticated) {
    return <PinEntry onSuccess={() => setAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-brand-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <p className="section-label">Admin Panel</p>
            <h1 className="text-3xl font-display font-bold gold-text">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-green-400 text-xs border border-green-500/30 bg-green-500/10 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authenticated
            </div>
            <button
              onClick={() => setAuthenticated(false)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-brand-cream/50 text-sm hover:text-brand-gold hover:border-brand-gold/40 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Lock
            </button>
          </div>
        </motion.div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-brand-black-2 border border-brand-gold/20 rounded-xl p-1 mb-8 w-fit">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  tab === t.id
                    ? 'bg-gold-gradient text-brand-black font-semibold shadow-gold-xl'
                    : 'text-brand-cream/50 hover:text-brand-gold'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6 shadow-gold-xl"
          >
            {tab === 'orders'   && <OrdersTab />}
            {tab === 'products' && <ProductsTab />}
            {tab === 'vendors'  && <VendorsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
