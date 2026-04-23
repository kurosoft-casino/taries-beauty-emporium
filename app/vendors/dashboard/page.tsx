'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, BarChart2, MessageCircle, Settings, LogOut, Plus, X, Eye,
  Send, Store, CheckCircle2, AlertCircle, Save, ShoppingBag, DollarSign,
} from 'lucide-react'
import { getViews } from '@/lib/views'

// ── Types ─────────────────────────────────────────────────────────────────────
interface VendorSession {
  id:           string
  businessName: string
  ownerName:    string
  email:        string
  phone:        string
  category:     string
  description:  string
  status:       'pending' | 'approved' | 'rejected'
  feeStatus:    'unpaid' | 'paid'
  whatsapp?:    string
}

interface VendorProduct {
  id:          string
  name:        string
  category:    string
  price:       number
  description: string
  whatsapp:    string
  addedAt:     string
}

interface Message {
  id:        string
  from:      string
  text:      string
  timestamp: string
  isOwn:     boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DEMO_PIN = '1234'

const DEMO_VENDOR: VendorSession = {
  id:           'demo-vendor-001',
  businessName: 'Demo Beauty Store',
  ownerName:    'Demo Vendor',
  email:        'demo@example.com',
  phone:        '+234 800 000 0000',
  category:     'Beauty & Cosmetics',
  description:  'A demo beauty store for testing the vendor dashboard.',
  status:       'approved',
  feeStatus:    'paid',
  whatsapp:     '+234 800 000 0000',
}

const DEMO_MESSAGES: Message[] = [
  {
    id:        'msg-demo-1',
    from:      'Sarah K.',
    text:      "Hi, I'm interested in your products! Can you send more details?",
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    isOwn:     false,
  },
]

const PRODUCT_CATEGORIES = [
  'Hair & Wigs', 'Beauty & Cosmetics', 'Clothing & Fashion', 'Accessories', 'Other',
]

// ── Login Gate ────────────────────────────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: (v: VendorSession) => void }) {
  const [email, setEmail] = useState('')
  const [pin,   setPin]   = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      setError('Please enter a valid email address')
      return
    }
    if (pin !== DEMO_PIN) {
      setError('Incorrect PIN. Hint: use 1234 for demo access.')
      return
    }

    let vendor: VendorSession = { ...DEMO_VENDOR, email }
    try {
      const raw = localStorage.getItem('taries-vendors')
      if (raw) {
        const vendors: VendorSession[] = JSON.parse(raw)
        const found = vendors.find(v => v.email.toLowerCase() === email.toLowerCase())
        if (found) {
          if (found.status !== 'approved') {
            setError(`Your application is "${found.status}". Only approved vendors can access the dashboard.`)
            return
          }
          vendor = { ...found, whatsapp: found.phone }
        }
      }
    } catch {}

    try { localStorage.setItem('taries-vendor-session', JSON.stringify(vendor)) } catch {}
    onLogin(vendor)
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-brand-gold" />
          </div>
          <p className="section-label">Vendor Portal</p>
          <h1 className="text-2xl font-display font-bold gold-text">Vendor Login</h1>
          <p className="text-brand-cream/35 text-xs mt-1">Demo mode — any email + PIN 1234</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 shadow-gold-xl space-y-4"
        >
          <div>
            <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-gold/50 transition-colors"
              placeholder="vendor@example.com"
            />
          </div>

          <div>
            <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">
              4-Digit PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
              className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-gold/50 transition-colors tracking-[0.5em]"
              placeholder="••••"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button type="submit" className="btn-gold w-full mt-2">
            Access Dashboard
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// ── Add Product Modal ─────────────────────────────────────────────────────────
function AddProductModal({
  email, onClose, onAdd,
}: {
  email:   string
  onClose: () => void
  onAdd:   (p: VendorProduct) => void
}) {
  const [form, setForm] = useState({
    name: '', category: '', price: '', description: '', whatsapp: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!form.name.trim()) err.name = 'Required'
    if (!form.category)    err.category = 'Required'
    if (!form.price || isNaN(+form.price) || +form.price <= 0) err.price = 'Valid price required'
    if (!form.description.trim()) err.description = 'Required'
    setErrors(err)
    if (Object.keys(err).length > 0) return

    const product: VendorProduct = {
      id:          'vp-' + Date.now(),
      name:        form.name,
      category:    form.category,
      price:       parseFloat(form.price),
      description: form.description,
      whatsapp:    form.whatsapp,
      addedAt:     new Date().toISOString(),
    }
    try {
      const key      = `taries-vendor-${email}-products`
      const raw      = localStorage.getItem(key)
      const existing: VendorProduct[] = raw ? JSON.parse(raw) : []
      existing.push(product)
      localStorage.setItem(key, JSON.stringify(existing))
    } catch {}
    onAdd(product)
    onClose()
  }

  function field(
    label: string,
    key: keyof typeof form,
    props?: React.InputHTMLAttributes<HTMLInputElement>,
  ) {
    return (
      <div>
        <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1">
          {label}
        </label>
        <input
          value={form[key]}
          onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); if (errors[key]) setErrors(er => { const n = { ...er }; delete n[key]; return n }) }}
          {...props}
          className={`w-full bg-brand-black-3 border rounded-xl px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors ${errors[key] ? 'border-red-500' : 'border-brand-gold/20 focus:border-brand-gold/50'}`}
        />
        {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="bg-brand-black-2 border border-brand-gold/30 rounded-2xl p-6 w-full max-w-md shadow-gold-xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-brand-cream font-display font-semibold">Add New Product</h3>
          <button
            onClick={onClose}
            className="text-brand-cream/35 hover:text-brand-cream transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('Product Name', 'name', { placeholder: 'e.g. Brazilian Wig 16 inch' })}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={e => { setForm(f => ({ ...f, category: e.target.value })); if (errors.category) setErrors(er => { const n = { ...er }; delete n.category; return n }) }}
                className={`w-full bg-brand-black-3 border rounded-xl px-3 py-2.5 text-brand-cream text-sm focus:outline-none transition-colors ${errors.category ? 'border-red-500' : 'border-brand-gold/20'}`}
              >
                <option value="">Select</option>
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
            </div>
            {field('Price (USD)', 'price', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
          </div>

          <div>
            <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Describe your product…"
              className={`w-full bg-brand-black-3 border rounded-xl px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors resize-none ${errors.description ? 'border-red-500' : 'border-brand-gold/20 focus:border-brand-gold/50'}`}
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
          </div>

          {field('WhatsApp for Inquiries', 'whatsapp', { type: 'tel', placeholder: '+234 800 000 0000' })}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-brand-gold/20 rounded-xl text-brand-cream/50 text-sm hover:border-brand-gold/40 hover:text-brand-cream/70 transition-all"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-gold !py-2.5">
              Add Product
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function VendorDashboardPage() {
  const [vendor,       setVendor]       = useState<VendorSession | null>(null)
  const [tab,          setTab]          = useState<'products' | 'analytics' | 'messages' | 'settings'>('products')
  const [products,     setProducts]     = useState<VendorProduct[]>([])
  const [views,        setViews]        = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [messages,     setMessages]     = useState<Message[]>(DEMO_MESSAGES)
  const [replyText,    setReplyText]    = useState('')
  const [settings,     setSettings]     = useState({ businessName: '', whatsapp: '', description: '' })
  const [savedAlert,   setSavedAlert]   = useState(false)
  const [mounted,      setMounted]      = useState(false)

  // Initialise on mount
  useEffect(() => {
    setMounted(true)
    setViews(getViews())
    try {
      const raw = localStorage.getItem('taries-vendor-session')
      if (raw) {
        const session: VendorSession = JSON.parse(raw)
        if (session.status === 'approved') {
          setVendor(session)
          loadData(session)
        }
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function loadData(v: VendorSession) {
    try {
      const raw = localStorage.getItem(`taries-vendor-${v.email}-products`)
      setProducts(raw ? JSON.parse(raw) : [])
    } catch { setProducts([]) }

    try {
      const raw = localStorage.getItem(`taries-vendor-${v.email}-messages`)
      setMessages(raw ? JSON.parse(raw) : DEMO_MESSAGES)
    } catch { setMessages(DEMO_MESSAGES) }

    setSettings({
      businessName: v.businessName,
      whatsapp:     v.whatsapp ?? v.phone,
      description:  v.description,
    })
  }

  function handleLogin(v: VendorSession) {
    setVendor(v)
    loadData(v)
  }

  function handleLogout() {
    try { localStorage.removeItem('taries-vendor-session') } catch {}
    setVendor(null)
  }

  function handleSendMessage() {
    if (!replyText.trim() || !vendor) return
    const msg: Message = {
      id:        'msg-' + Date.now(),
      from:      vendor.ownerName,
      text:      replyText,
      timestamp: new Date().toISOString(),
      isOwn:     true,
    }
    const updated = [...messages, msg]
    setMessages(updated)
    setReplyText('')
    try {
      localStorage.setItem(`taries-vendor-${vendor.email}-messages`, JSON.stringify(updated))
    } catch {}
  }

  function handleSaveSettings() {
    if (!vendor) return
    const updated: VendorSession = {
      ...vendor,
      businessName: settings.businessName,
      whatsapp:     settings.whatsapp,
      description:  settings.description,
    }
    setVendor(updated)
    try { localStorage.setItem('taries-vendor-session', JSON.stringify(updated)) } catch {}
    setSavedAlert(true)
    setTimeout(() => setSavedAlert(false), 2500)
  }

  // Prevent SSR mismatch
  if (!mounted) return null
  if (!vendor)  return <LoginGate onLogin={handleLogin} />

  // Analytics data
  const analyticsData = products.length > 0
    ? products.map(p => ({ name: p.name, views: views[p.id] ?? 0 }))
    : [
        { name: 'Sample Wig A',      views: 47 },
        { name: 'Sample Serum B',    views: 31 },
        { name: 'Sample Lash Set C', views: 18 },
      ]
  const maxViews = Math.max(...analyticsData.map(a => a.views), 1)

  const tabs = [
    { id: 'products'  as const, label: 'My Products', icon: Package       },
    { id: 'analytics' as const, label: 'Analytics',   icon: BarChart2     },
    { id: 'messages'  as const, label: 'Messages',    icon: MessageCircle },
    { id: 'settings'  as const, label: 'Settings',    icon: Settings      },
  ]

  const statCards = [
    { label: 'Products Listed', value: products.length,                                        icon: Package,     color: 'text-brand-gold'  },
    { label: 'Total Views',     value: products.reduce((a, p) => a + (views[p.id] ?? 0), 0),  icon: Eye,         color: 'text-blue-400'    },
    { label: 'Orders Received', value: 0,                                                       icon: ShoppingBag, color: 'text-green-400'   },
    { label: 'Revenue (USD)',   value: '$0.00',                                                 icon: DollarSign,  color: 'text-purple-400'  },
  ]

  return (
    <div className="min-h-screen bg-brand-black pt-16 pb-16">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 border-b border-brand-gold/20 bg-brand-black-2/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
              <Store className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h1 className="text-brand-cream font-display font-semibold text-sm leading-none">
                {vendor.businessName}
              </h1>
              <span className="inline-flex items-center gap-1 text-green-400 text-xs mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Approved
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-brand-cream/45 hover:text-brand-gold transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4 hover:border-brand-gold/35 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-brand-cream/40 text-xs uppercase tracking-wide">{s.label}</span>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
              </motion.div>
            )
          })}
        </div>

        {/* ── Tab nav ── */}
        <div className="flex gap-1 bg-brand-black-2 border border-brand-gold/20 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-none">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
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

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {/* ══ MY PRODUCTS ══════════════════════════════════════════════════ */}
            {tab === 'products' && (
              <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-brand-cream font-display font-semibold">My Products</h2>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-gold flex items-center gap-1.5 !px-5 !py-2 !text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="py-16 text-center">
                    <Package className="w-12 h-12 text-brand-gold/20 mx-auto mb-4" />
                    <h3 className="text-brand-cream/50 font-display text-lg">No products yet</h3>
                    <p className="text-brand-cream/25 text-sm mt-1">
                      Click &ldquo;Add Product&rdquo; to list your first item.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-brand-gold/20">
                          {['Product', 'Category', 'Price', 'Views', 'Added'].map(h => (
                            <th key={h} className="text-left py-2.5 px-3 text-brand-gold/55 text-xs uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr
                            key={p.id}
                            className="border-b border-brand-gold/10 hover:bg-brand-gold/5 transition-colors"
                          >
                            <td className="py-3 px-3 text-brand-cream font-medium">{p.name}</td>
                            <td className="py-3 px-3 text-brand-cream/55 text-xs">{p.category}</td>
                            <td className="py-3 px-3 text-brand-gold font-semibold">${p.price.toFixed(2)}</td>
                            <td className="py-3 px-3">
                              <span className="flex items-center gap-1 text-brand-cream/55 text-xs">
                                <Eye className="w-3 h-3 text-brand-gold" />
                                {views[p.id] ?? 0}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-brand-cream/35 text-xs">
                              {new Date(p.addedAt).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══ ANALYTICS ════════════════════════════════════════════════════ */}
            {tab === 'analytics' && (
              <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-brand-cream font-display font-semibold">Product Views</h2>
                  <span className="text-brand-cream/35 text-xs border border-brand-gold/20 px-3 py-1 rounded-full">
                    Last 7 days
                  </span>
                </div>

                <div className="space-y-5">
                  {analyticsData.map((item, i) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-brand-cream/75 text-sm truncate max-w-[60%]">
                          {item.name}
                        </span>
                        <span className="text-brand-gold font-semibold text-sm">
                          {item.views} views
                        </span>
                      </div>
                      <div className="w-full h-3 bg-brand-black-3 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.views / maxViews) * 100}%` }}
                          transition={{ duration: 0.9, delay: i * 0.1, ease: 'easeOut' }}
                          className="h-full bg-gold-gradient rounded-full"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-brand-black-3 border border-brand-gold/20 rounded-xl p-4">
                    <p className="text-brand-cream/35 text-xs mb-1">Total Views</p>
                    <p className="text-brand-gold text-2xl font-display font-bold">
                      {analyticsData.reduce((a, b) => a + b.views, 0)}
                    </p>
                  </div>
                  <div className="bg-brand-black-3 border border-brand-gold/20 rounded-xl p-4">
                    <p className="text-brand-cream/35 text-xs mb-1">Top Product</p>
                    <p className="text-brand-cream text-sm font-semibold truncate">
                      {analyticsData[0]?.name ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══ MESSAGES ═════════════════════════════════════════════════════ */}
            {tab === 'messages' && (
              <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl overflow-hidden">
                <div className="flex" style={{ height: '520px' }}>
                  {/* Conversations list */}
                  <div className="w-64 border-r border-brand-gold/20 flex flex-col flex-shrink-0">
                    <div className="px-4 py-3.5 border-b border-brand-gold/20">
                      <h2 className="text-brand-cream font-display font-semibold text-sm">Inbox</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <button className="w-full text-left p-4 bg-brand-gold/8 border-l-2 border-brand-gold hover:bg-brand-gold/12 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-xs font-bold flex-shrink-0">
                            SK
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-brand-cream text-xs font-semibold">Sarah K.</p>
                            <p className="text-brand-cream/35 text-xs truncate">
                              Interested in products
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Message thread */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="px-5 py-3.5 border-b border-brand-gold/20">
                      <p className="text-brand-cream text-sm font-semibold">Sarah K.</p>
                      <p className="text-brand-cream/35 text-xs">Customer</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm ${
                              msg.isOwn
                                ? 'bg-brand-gold/20 text-brand-cream rounded-br-none'
                                : 'bg-brand-black-3 text-brand-cream/75 rounded-bl-none'
                            }`}
                          >
                            <p>{msg.text}</p>
                            <p className="text-[10px] mt-1 opacity-45">
                              {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-brand-gold/20">
                      <div className="flex gap-2">
                        <input
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a reply…"
                          className="flex-1 bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-gold/40 transition-colors"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center text-brand-black flex-shrink-0 hover:opacity-90 transition-opacity"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ SETTINGS ═════════════════════════════════════════════════════ */}
            {tab === 'settings' && (
              <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                <h2 className="text-brand-cream font-display font-semibold mb-6">Profile Settings</h2>

                <div className="max-w-lg space-y-4">
                  <div>
                    <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">
                      Business Name
                    </label>
                    <input
                      value={settings.businessName}
                      onChange={e => setSettings(s => ({ ...s, businessName: e.target.value }))}
                      className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={settings.whatsapp}
                      onChange={e => setSettings(s => ({ ...s, whatsapp: e.target.value }))}
                      className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">
                      Business Description
                    </label>
                    <textarea
                      value={settings.description}
                      onChange={e => setSettings(s => ({ ...s, description: e.target.value }))}
                      rows={4}
                      className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none focus:border-brand-gold/50 transition-colors resize-none"
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleSaveSettings}
                      className="btn-gold flex items-center gap-2"
                    >
                      {savedAlert
                        ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                        : <><Save className="w-4 h-4" /> Save Changes</>
                      }
                    </button>
                  </div>
                </div>

                {/* Account info (read-only) */}
                <div className="mt-8 pt-6 border-t border-brand-gold/20">
                  <h3 className="text-brand-cream/40 text-xs uppercase tracking-widest font-semibold mb-4">
                    Account Info
                  </h3>
                  <div className="grid grid-cols-2 gap-3 max-w-lg">
                    {[
                      { label: 'Email',      value: vendor.email                                    },
                      { label: 'Owner',      value: vendor.ownerName                                },
                      { label: 'Category',   value: vendor.category                                 },
                      { label: 'Fee Status', value: vendor.feeStatus === 'paid' ? '✓ Paid' : 'Unpaid' },
                    ].map(item => (
                      <div
                        key={item.label}
                        className="bg-brand-black-3 border border-brand-gold/10 rounded-xl p-3"
                      >
                        <p className="text-brand-cream/30 text-xs mb-0.5">{item.label}</p>
                        <p className="text-brand-cream text-sm font-medium truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Add Product Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddProductModal
            email={vendor.email}
            onClose={() => setShowAddModal(false)}
            onAdd={p => setProducts(prev => [...prev, p])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
