'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, BarChart2, MessageCircle, Settings, LogOut, Plus, X, Eye,
  Send, Store, CheckCircle2, AlertCircle, Save, ShoppingBag, DollarSign, Pencil,
} from 'lucide-react'
import { getViews } from '@/lib/views'
import ProductForm, { emptyFormData, type ProductFormData } from '@/components/ui/ProductForm'
import {
  addVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  getVendorProducts,
  type VendorProduct,
} from '@/lib/productStore'
import { readJSON, writeJSON, writeText } from '@/lib/storage'
import { getCurrentUser } from '@/lib/auth'
import { isValidEmail, normalizeEmail, sanitizeDigits } from '@/lib/validation'
import {
  clearVendorSession,
  findVendorProfileByEmail,
  getVendorSession,
  writeVendorSession,
  type VendorProfile,
} from '@/lib/vendorProfile'

// ── Types ─────────────────────────────────────────────────────────────────────
type VendorSession = VendorProfile

interface Message {
  id:        string
  from:      string
  text:      string
  timestamp: string
  isOwn:     boolean
  read:      boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DEMO_MESSAGES: Message[] = [
  {
    id:        'msg-demo-1',
    from:      'Amara O.',
    text:      'Hi! I love your products. Do you ship to Abuja?',
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    isOwn:     false,
    read:      false,
  },
  {
    id:        'msg-demo-2',
    from:      'Kofi A.',
    text:      'Can I get a discount for bulk order of 5 wigs?',
    timestamp: new Date(Date.now() - 7_200_000).toISOString(),
    isOwn:     false,
    read:      true,
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
    const normalizedEmail = normalizeEmail(email)
    const normalizedPin = sanitizeDigits(pin)
    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address')
      return
    }
    if (!/^\d{6}$/.test(normalizedPin)) {
      setError('Enter your 6-digit vendor PIN')
      return
    }
    const vendors = readJSON<VendorSession[]>('taries-vendors', [])
    const found = vendors.find(v => v.email.toLowerCase() === normalizedEmail)
    if (!found) {
      setError('No vendor account found for this email. Please register first.')
      return
    }
    if (found.status === 'pending') {
      setError('Your application is pending admin approval. Check back in 24–48 hours.')
      return
    }
    if (found.status === 'rejected') {
      setError('Your application was not approved. Contact us on WhatsApp.')
      return
    }

    const storedPin = localStorage.getItem(`taries-vendor-pin-${normalizedEmail}`)
    if (!storedPin || storedPin !== normalizedPin) {
      setError('Incorrect vendor PIN.')
      return
    }

    const vendor = { ...found, whatsapp: found.phone }
    if (!writeJSON('taries-vendor-session', vendor)) {
      setError('Could not open the vendor session on this device.')
      return
    }
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
          <p className="text-brand-cream/35 text-xs mt-1">Use your approved vendor email and secure PIN</p>
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
                6-Digit PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={e => { setPin(sanitizeDigits(e.target.value).slice(0, 6)); setError('') }}
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

function AccountVendorGate({
  vendorProfile,
}: {
  vendorProfile: VendorSession | null
}) {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 shadow-gold-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-brand-gold" />
          </div>
          <p className="section-label">Vendor Access</p>
          <h1 className="text-2xl font-display font-bold gold-text">
            {vendorProfile ? 'Vendor account status' : 'Use your account profile'}
          </h1>
          <p className="text-brand-cream/55 text-sm mt-3 leading-relaxed">
            {vendorProfile
              ? vendorProfile.status === 'pending'
                ? 'Your vendor application is still pending admin approval. You can monitor it from your account profile.'
                : 'Your vendor application is not approved yet. Please manage it from your account profile or contact support.'
              : 'Vendor access now lives inside your normal account profile. Sign in first, then open Vendor Hub from My Account.'}
          </p>

          {vendorProfile && (
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-gold/20 bg-brand-gold/10 text-brand-gold text-xs font-semibold uppercase tracking-wider">
              Status: {vendorProfile.status}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/account" className="btn-gold">
              Open My Account
            </Link>
            {!vendorProfile && (
              <Link href="/vendors/register" className="btn-outline-gold">
                Apply as Vendor
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Product Panel (slide-in) ──────────────────────────────────────────────────
function ProductPanel({
  vendor,
  editing,
  onClose,
  onSave,
}: {
  vendor:   VendorSession
  editing?: VendorProduct | null
  onClose:  () => void
  onSave:   (p: VendorProduct) => void
}) {
  const initialData: Partial<ProductFormData> = editing
    ? {
        name:          editing.name,
        category:      editing.category,
        price:         String(editing.price),
        originalPrice: editing.originalPrice ? String(editing.originalPrice) : '',
        description:   editing.description,
        shortDesc:     editing.shortDesc ?? '',
        images:        editing.images ?? [],
        video:         editing.video ?? '',
        inStock:       editing.inStock ?? true,
        stockCount:    editing.stockCount ? String(editing.stockCount) : '',
        badge:         editing.badge ?? '',
        whatsapp:      editing.whatsapp,
        features:      editing.features ?? [],
        variants:      (editing.variants ?? []).map(v => ({
          label:   v.label,
          options: v.options.join(', '),
        })),
      }
    : { whatsapp: vendor.whatsapp ?? vendor.phone }

  function handleSubmit(data: ProductFormData) {
    const variants = data.variants
      .filter(v => v.label.trim())
      .map(v => ({
        label:   v.label,
        options: v.options.split(',').map(s => s.trim()).filter(Boolean),
      }))

    if (editing) {
      updateVendorProduct(vendor.email, editing.id, {
        name:          data.name,
        category:      data.category,
        price:         parseFloat(data.price),
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
        description:   data.description,
        shortDesc:     data.shortDesc,
        images:        data.images,
        video:         data.video,
        inStock:       data.inStock,
        stockCount:    data.stockCount ? parseInt(data.stockCount) : undefined,
        badge:         data.badge as VendorProduct['badge'],
        whatsapp:      data.whatsapp,
        features:      data.features,
        variants,
        active:        editing.active,
      })
      const all = getVendorProducts(vendor.email)
      onSave(all.find(p => p.id === editing.id) ?? editing)
    } else {
      const newProduct = addVendorProduct(vendor.email, {
        name:          data.name,
        category:      data.category,
        price:         parseFloat(data.price),
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
        description:   data.description,
        shortDesc:     data.shortDesc,
        images:        data.images,
        video:         data.video,
        inStock:       data.inStock,
        stockCount:    data.stockCount ? parseInt(data.stockCount) : undefined,
        badge:         data.badge as VendorProduct['badge'],
        whatsapp:      data.whatsapp,
        features:      data.features,
        variants,
        active:        true,
      })
      onSave(newProduct)
    }
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel — right drawer on desktop, bottom drawer on mobile */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] lg:w-[580px] z-50 flex flex-col bg-brand-black-2 border-l border-brand-gold/20 shadow-gold-xl"
      >
        <div className="sticky top-0 bg-brand-black-2 border-b border-brand-gold/20 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="text-brand-cream font-display font-semibold">
            {editing ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            onClick={onClose}
            className="text-brand-cream/35 hover:text-brand-cream transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <ProductForm
            initial={initialData}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitLabel={editing ? 'Save Changes' : 'List Product'}
          />
        </div>
      </motion.div>
    </>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function VendorDashboardPage() {
  const [vendor,          setVendor]          = useState<VendorSession | null>(null)
  const [linkedVendor,    setLinkedVendor]    = useState<VendorSession | null>(null)
  const [currentEmail,    setCurrentEmail]    = useState<string | null>(null)
  const [tab,             setTab]             = useState<'products' | 'analytics' | 'messages' | 'settings'>('products')
  const [products,        setProducts]        = useState<VendorProduct[]>([])
  const [views,           setViews]           = useState<Record<string, number>>({})
  const [showPanel,       setShowPanel]       = useState<'add' | 'edit' | null>(null)
  const [editingProduct,  setEditingProduct]  = useState<VendorProduct | null>(null)
  const [messages,        setMessages]        = useState<Message[]>(DEMO_MESSAGES)
  const [activeConvoIdx,  setActiveConvoIdx]  = useState(0)
  const [replyText,       setReplyText]       = useState('')
  const [settings,        setSettings]        = useState({ businessName: '', whatsapp: '', category: '', description: '' })
  const [savedAlert,      setSavedAlert]      = useState(false)
  const [pinForm,         setPinForm]         = useState({ current: '', next: '', confirm: '' })
  const [pinError,        setPinError]        = useState('')
  const [pinSuccess,      setPinSuccess]      = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm,   setDeleteConfirm]   = useState('')
  const [mounted,         setMounted]         = useState(false)

  // Initialise on mount
  useEffect(() => {
    setMounted(true)
    setViews(getViews())
    const user = getCurrentUser()
    const email = user?.email ?? null
    setCurrentEmail(email)

    if (email) {
      const matchedVendor = findVendorProfileByEmail(email)
      setLinkedVendor(matchedVendor)
      if (matchedVendor?.status === 'approved') {
        const session = { ...matchedVendor, whatsapp: matchedVendor.whatsapp ?? matchedVendor.phone }
        writeVendorSession(session)
        setVendor(session)
        loadData(session)
      }
      return
    }

    const session = getVendorSession()
    if (session?.status === 'approved') {
      setVendor(session)
      loadData(session)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function loadData(v: VendorSession) {
    setProducts(getVendorProducts(v.email))

    try {
      const raw = localStorage.getItem(`taries-vendor-${v.email}-messages`)
      setMessages(raw ? JSON.parse(raw) : DEMO_MESSAGES)
    } catch { setMessages(DEMO_MESSAGES) }

    setSettings({
      businessName: v.businessName,
      whatsapp:     v.whatsapp ?? v.phone,
      category:     v.category,
      description:  v.description,
    })
  }

  function handleLogin(v: VendorSession) {
    setVendor(v)
    setLinkedVendor(v)
    loadData(v)
  }

  function handleLogout() {
    clearVendorSession()
    setVendor(null)
  }

  function saveMessages(updated: Message[]) {
    if (!vendor) return
    setMessages(updated)
    try { localStorage.setItem(`taries-vendor-${vendor.email}-messages`, JSON.stringify(updated)) } catch {}
  }

  function handleSendMessage() {
    if (!replyText.trim() || !vendor) return
    const msg: Message = {
      id:        'msg-' + Date.now(),
      from:      vendor.ownerName,
      text:      replyText,
      timestamp: new Date().toISOString(),
      isOwn:     true,
      read:      true,
    }
    saveMessages([...messages, msg])
    setReplyText('')
  }

  function toggleProductActive(id: string) {
    if (!vendor) return
    const p = products.find(p => p.id === id)
    if (!p) return
    updateVendorProduct(vendor.email, id, { active: !p.active })
    setProducts(getVendorProducts(vendor.email))
  }

  function deleteProduct(id: string) {
    if (!vendor) return
    deleteVendorProduct(vendor.email, id)
    setProducts(getVendorProducts(vendor.email))
  }

  function handleSaveSettings() {
    if (!vendor) return
    const updated: VendorSession = {
      ...vendor,
      businessName: settings.businessName,
      whatsapp:     settings.whatsapp,
      category:     settings.category,
      description:  settings.description,
    }
    setVendor(updated)
    writeVendorSession(updated)
    // Update vendors list
    try {
      const raw = localStorage.getItem('taries-vendors')
      if (raw) {
        const vendors: VendorSession[] = JSON.parse(raw)
        const idx = vendors.findIndex(v => v.email.toLowerCase() === updated.email.toLowerCase())
        if (idx !== -1) {
          vendors[idx] = { ...vendors[idx], ...updated }
          localStorage.setItem('taries-vendors', JSON.stringify(vendors))
        }
      }
    } catch {}
    setSavedAlert(true)
    setTimeout(() => setSavedAlert(false), 2500)
  }

  function handleChangePin() {
    if (!vendor) return
    const storedPin = localStorage.getItem(`taries-vendor-pin-${vendor.email}`)
    if (pinForm.current !== storedPin) { setPinError('Current PIN is incorrect'); return }
    if (!/^\d{6}$/.test(pinForm.next)) { setPinError('New PIN must be exactly 6 digits'); return }
    if (pinForm.next !== pinForm.confirm) { setPinError('PINs do not match'); return }
    if (!writeText(`taries-vendor-pin-${vendor.email}`, pinForm.next)) {
      setPinError('Could not save the new PIN on this device')
      return
    }
    setPinError('')
    setPinForm({ current: '', next: '', confirm: '' })
    setPinSuccess(true)
    setTimeout(() => setPinSuccess(false), 3000)
  }

  function handleDeleteAccount() {
    if (!vendor || deleteConfirm !== vendor.email) return
    try {
      clearVendorSession()
      localStorage.removeItem(`taries-vendor-${vendor.email}-products`)
      localStorage.removeItem(`taries-vendor-${vendor.email}-messages`)
      const raw = localStorage.getItem('taries-vendors')
      if (raw) {
        const vendors: VendorSession[] = JSON.parse(raw)
        localStorage.setItem('taries-vendors', JSON.stringify(vendors.filter(v => v.email !== vendor.email)))
      }
    } catch {}
    setVendor(null)
  }

  // Prevent SSR mismatch
  if (!mounted) return null
  if (!vendor) {
    if (currentEmail) return <AccountVendorGate vendorProfile={linkedVendor} />
    return <LoginGate onLogin={handleLogin} />
  }

  // Analytics data — use slug for view lookup
  const analyticsData = products.length > 0
    ? products.map(p => ({
        name:  p.name,
        views: views[p.name.toLowerCase().replace(/\s+/g, '-')] ?? (views[p.id] ?? 0),
      }))
    : [
        { name: 'Sample Wig A',      views: 47 },
        { name: 'Sample Serum B',    views: 31 },
        { name: 'Sample Lash Set C', views: 18 },
      ]
  const maxViews = Math.max(...analyticsData.map(a => a.views), 1)

  // Fake sparkline heights seeded from email hash
  const emailHash = vendor.email.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 7)
  const sparkHeights = Array.from({ length: 7 }, (_, i) => {
    const seed = (emailHash + i * 137) % 100
    return Math.max(20, seed)
  })

  const unreadCount = messages.filter(m => !m.isOwn && !m.read).length

  // Group messages by sender (simple: just show unique non-own senders)
  const convos = Array.from(
    messages.reduce((acc, m) => {
      if (!m.isOwn) acc.set(m.from, m)
      return acc
    }, new Map<string, Message>())
  ).map(([from, last]) => ({ from, last }))

  const tabs = [
    { id: 'products'  as const, label: 'My Products', icon: Package,       badge: 0           },
    { id: 'analytics' as const, label: 'Analytics',   icon: BarChart2,     badge: 0           },
    { id: 'messages'  as const, label: 'Messages',    icon: MessageCircle, badge: unreadCount },
    { id: 'settings'  as const, label: 'Settings',    icon: Settings,      badge: 0           },
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
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 relative ${
                  tab === t.id
                    ? 'bg-gold-gradient text-brand-black font-semibold shadow-gold-xl'
                    : 'text-brand-cream/50 hover:text-brand-gold'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
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
                    onClick={() => { setEditingProduct(null); setShowPanel('add') }}
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
                          {['', 'Product', 'Category', 'Price', 'Views', 'Status', 'Actions'].map(h => (
                            <th key={h} className="text-left py-2.5 px-3 text-brand-gold/55 text-xs uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => {
                          const slug = p.name.toLowerCase().replace(/\s+/g, '-')
                          const viewCount = views[slug] ?? (views[p.id] ?? 0)
                          const thumb = p.images?.[0]
                          return (
                            <tr
                              key={p.id}
                              className="border-b border-brand-gold/10 hover:bg-brand-gold/5 transition-colors"
                            >
                              <td className="py-3 px-3">
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-brand-gold/15 flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-brand-black-3 border border-brand-gold/15 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-brand-gold/25" />
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-brand-cream font-medium text-sm max-w-[140px] truncate">{p.name}</td>
                              <td className="py-3 px-3 text-brand-cream/55 text-xs">{p.category}</td>
                              <td className="py-3 px-3 text-brand-gold font-semibold text-sm">${p.price.toFixed(2)}</td>
                              <td className="py-3 px-3">
                                <span className="flex items-center gap-1 text-brand-cream/55 text-xs">
                                  <Eye className="w-3 h-3 text-brand-gold" />
                                  {viewCount}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  onClick={() => toggleProductActive(p.id)}
                                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                                    p.active !== false
                                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                                      : 'bg-brand-cream/10 text-brand-cream/35 hover:bg-brand-cream/20'
                                  }`}
                                >
                                  {p.active !== false ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setEditingProduct(p); setShowPanel('edit') }}
                                    className="text-brand-gold/50 hover:text-brand-gold transition-colors"
                                    title="Edit product"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteProduct(p.id)}
                                    className="text-red-400/60 hover:text-red-400 transition-colors"
                                    title="Delete product"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══ ANALYTICS ════════════════════════════════════════════════════ */}
            {tab === 'analytics' && (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Products', value: products.length,                                          color: 'text-brand-gold'  },
                    { label: 'Total Views',     value: analyticsData.reduce((a, b) => a + b.views, 0),          color: 'text-blue-400'    },
                    { label: 'Messages',        value: messages.filter(m => !m.isOwn).length,                   color: 'text-green-400'   },
                    { label: 'Revenue',         value: '$0',                                                     color: 'text-purple-400'  },
                  ].map((c, i) => (
                    <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4">
                      <p className="text-brand-cream/40 text-xs mb-2">{c.label}</p>
                      <p className={`text-2xl font-display font-bold ${c.color}`}>{c.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Top products bar chart */}
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                  <h2 className="text-brand-cream font-display font-semibold mb-6">Top Products by Views</h2>
                  <div className="space-y-4">
                    {analyticsData.map((item, i) => (
                      <motion.div key={item.name} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-brand-cream/75 text-sm truncate max-w-[60%]">
                            {item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name}
                          </span>
                          <span className="text-brand-gold font-semibold text-sm">{item.views}</span>
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
                </div>

                {/* Page visits sparkline */}
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-brand-cream font-display font-semibold">Page Visits This Week</h2>
                    <span className="text-brand-cream/35 text-xs border border-brand-gold/20 px-3 py-1 rounded-full">Last 7 days</span>
                  </div>
                  <div className="flex items-end gap-2 h-20">
                    {sparkHeights.map((h, i) => {
                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
                            className="w-full bg-gold-gradient rounded-t-sm min-h-[4px]"
                            style={{ height: `${h}%` }}
                            title={`${h} visits`}
                          />
                          <span className="text-[9px] text-brand-cream/30 font-body">{days[i]}</span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-brand-cream/25 text-xs mt-3 text-center">Based on estimated page activity</p>
                </div>
              </div>
            )}

            {/* ══ MESSAGES ═════════════════════════════════════════════════════ */}
            {tab === 'messages' && (
              <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl overflow-hidden">
                <div className="flex overflow-x-auto" style={{ minHeight: '520px' }}>
                  {/* Conversations list */}
                  <div className="w-44 sm:w-56 md:w-64 border-r border-brand-gold/20 flex flex-col flex-shrink-0">
                    <div className="px-4 py-3.5 border-b border-brand-gold/20 flex items-center justify-between">
                      <h2 className="text-brand-cream font-display font-semibold text-sm">Inbox</h2>
                      {unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {convos.map((convo, idx) => {
                        const isUnread = !convo.last.read
                        const initials = convo.from.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        return (
                          <button
                            key={convo.from}
                            onClick={() => {
                              setActiveConvoIdx(idx)
                              const updated = messages.map(m => m.from === convo.from ? { ...m, read: true } : m)
                              saveMessages(updated)
                            }}
                            className={`w-full text-left p-4 transition-colors border-b border-brand-gold/10 ${
                              activeConvoIdx === idx
                                ? 'bg-brand-gold/10 border-l-2 border-l-brand-gold'
                                : 'hover:bg-brand-gold/5 border-l-2 border-l-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-xs font-bold flex-shrink-0 relative">
                                {initials}
                                {isUnread && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-brand-black-2" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold ${isUnread ? 'text-brand-cream' : 'text-brand-cream/60'}`}>
                                  {convo.from}
                                </p>
                                <p className="text-brand-cream/35 text-xs truncate">{convo.last.text}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                      {convos.length === 0 && (
                        <p className="text-brand-cream/25 text-xs text-center py-8 px-4">No messages yet</p>
                      )}
                    </div>
                  </div>

                  {/* Message thread */}
                  {convos.length > 0 && (
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="px-5 py-3.5 border-b border-brand-gold/20">
                        <p className="text-brand-cream text-sm font-semibold">{convos[activeConvoIdx]?.from ?? ''}</p>
                        <p className="text-brand-cream/35 text-xs">Customer</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '380px' }}>
                        {messages
                          .filter(m => m.from === convos[activeConvoIdx]?.from || m.isOwn)
                          .map(msg => (
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
                              {!msg.isOwn && (
                                <p className="text-brand-gold/60 text-[10px] font-semibold mb-1">{msg.from}</p>
                              )}
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
                  )}
                </div>
              </div>
            )}

            {/* ══ SETTINGS ═════════════════════════════════════════════════════ */}
            {tab === 'settings' && (
              <div className="space-y-6">
                {/* Profile */}
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                  <h2 className="text-brand-cream font-display font-semibold mb-6">Profile Settings</h2>
                  <div className="max-w-lg space-y-4">
                    <div>
                      <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">Business Name</label>
                      <input value={settings.businessName} onChange={e => setSettings(s => ({ ...s, businessName: e.target.value }))}
                        className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none focus:border-brand-gold/50 transition-colors" />
                    </div>
                    <div>
                      <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">WhatsApp Number</label>
                      <input type="tel" value={settings.whatsapp} onChange={e => setSettings(s => ({ ...s, whatsapp: e.target.value }))}
                        className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none focus:border-brand-gold/50 transition-colors" />
                    </div>
                    <div>
                      <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">Business Category</label>
                      <select value={settings.category} onChange={e => setSettings(s => ({ ...s, category: e.target.value }))}
                        className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none focus:border-brand-gold/50 transition-colors">
                        {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">Business Description</label>
                      <textarea value={settings.description} onChange={e => setSettings(s => ({ ...s, description: e.target.value }))}
                        rows={4} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none focus:border-brand-gold/50 transition-colors resize-none" />
                    </div>
                    <div className="pt-2">
                      <button onClick={handleSaveSettings} className="btn-gold flex items-center gap-2">
                        {savedAlert ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Change PIN */}
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                  <h3 className="text-brand-cream font-display font-semibold mb-5">Change PIN</h3>
                  <div className="max-w-xs space-y-3">
                    {[
                      { label: 'Current PIN', key: 'current' as const },
                      { label: 'New PIN (6 digits)', key: 'next' as const },
                      { label: 'Confirm New PIN', key: 'confirm' as const },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1">{f.label}</label>
                        <input
                          type="password"
                          maxLength={6}
                          value={pinForm[f.key]}
                          onChange={e => { setPinForm(p => ({ ...p, [f.key]: sanitizeDigits(e.target.value).slice(0, 6) })); setPinError('') }}
                          className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-2.5 text-brand-cream text-sm tracking-[0.5em] focus:outline-none focus:border-brand-gold/50 transition-colors"
                          placeholder="••••"
                        />
                      </div>
                    ))}
                    <AnimatePresence>
                      {pinError && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="text-red-400 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {pinError}
                        </motion.p>
                      )}
                      {pinSuccess && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> PIN updated successfully!
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <button onClick={handleChangePin} className="btn-gold !py-2 !text-xs flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5" /> Update PIN
                    </button>
                  </div>
                </div>

                {/* Danger zone */}
                <div className="bg-brand-black-2 border border-red-500/30 rounded-2xl p-6">
                  <h3 className="text-red-400 font-display font-semibold mb-2">Danger Zone</h3>
                  <p className="text-brand-cream/35 text-xs mb-4">Permanently delete your vendor account and all associated data. This action cannot be undone.</p>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="border border-red-500/40 text-red-400 hover:bg-red-500/10 px-4 py-2 text-sm font-body font-semibold rounded-xl transition-all">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            <AnimatePresence>
              {showDeleteModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
                  <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
                    className="bg-brand-black-2 border border-red-500/40 rounded-2xl p-6 w-full max-w-sm shadow-gold-xl">
                    <h3 className="text-red-400 font-display font-semibold mb-2">Delete Account?</h3>
                    <p className="text-brand-cream/50 text-sm mb-4">Type your email address to confirm deletion:</p>
                    <p className="text-brand-gold text-xs font-mono mb-3">{vendor.email}</p>
                    <input
                      value={deleteConfirm}
                      onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-brand-black-3 border border-red-500/30 rounded-xl px-4 py-2.5 text-brand-cream text-sm mb-4 focus:outline-none focus:border-red-500/60 transition-colors"
                    />
                    <div className="flex gap-3">
                      <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}
                        className="flex-1 py-2.5 border border-brand-gold/20 rounded-xl text-brand-cream/50 text-sm hover:text-brand-cream/70 transition-all">
                        Cancel
                      </button>
                      <button onClick={handleDeleteAccount} disabled={deleteConfirm !== vendor.email}
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Delete Forever
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Product Panel ── */}
      <AnimatePresence>
        {showPanel !== null && vendor && (
          <ProductPanel
            vendor={vendor}
            editing={showPanel === 'edit' ? editingProduct : null}
            onClose={() => { setShowPanel(null); setEditingProduct(null) }}
            onSave={saved => {
              setProducts(getVendorProducts(vendor.email))
              setShowPanel(null)
              setEditingProduct(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
