'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Eye, LogOut, MessageCircle, Package, Pencil, Plus, Save, Send, Store, Trash2, X } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { apiJson, apiRequest } from '@/lib/remoteApi'
import ProductForm, { type ProductFormData } from '@/components/ui/ProductForm'

interface VendorProfile {
  id: string
  businessName: string
  category: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  phone: string
  createdAt: string
}

interface VendorProduct {
  id: string
  name: string
  category: string
  price: number
  originalPrice?: number
  description: string
  shortDesc?: string
  images: string[]
  video?: string
  inStock: boolean
  stockCount?: number
  badge?: 'new' | 'sale' | 'hot' | 'bestseller' | ''
  whatsapp?: string
  features: string[]
  variants: { label: string; options: string[] }[]
  active: boolean
  status: 'pending' | 'approved' | 'featured' | 'removed'
  addedAt: string
}

interface Conversation {
  id: string
  subject?: string | null
  customer_first_name?: string | null
  customer_last_name?: string | null
  unread_vendor?: number
  updatedAt?: string
}

interface ChatMessage {
  id: string
  role: 'customer' | 'support'
  text: string
  timestamp: string
}

interface RemoteVendor {
  id: string
  brand_name?: string | null
  business_name?: string | null
  display_name?: string | null
  bio?: string | null
  status?: string | null
  created_at?: string | null
}

interface RemoteProduct {
  id: string
  name?: string
  category?: string
  price?: number
  original_price?: number | null
  description?: string
  short_desc?: string | null
  images_json?: string | null
  video?: string | null
  in_stock?: number | boolean | null
  stock_count?: number | null
  badge?: VendorProduct['badge'] | null
  whatsapp?: string | null
  features_json?: string | null
  variants_json?: string | null
  active?: number | boolean | null
  status?: VendorProduct['status'] | null
  added_at?: string | null
}

function parseJsonList(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(item => String(item)) : []
  } catch {
    return []
  }
}

function parseVariantList(value: string | null | undefined): { label: string; options: string[] }[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry): entry is { label?: unknown; options?: unknown } => typeof entry === 'object' && entry !== null)
      .map(entry => ({
        label: typeof entry.label === 'string' ? entry.label : '',
        options: Array.isArray(entry.options) ? entry.options.map(option => String(option)).filter(Boolean) : [],
      }))
      .filter(entry => entry.label)
  } catch {
    return []
  }
}

function mapVendor(remote: RemoteVendor): VendorProfile {
  const status = remote.status === 'approved' || remote.status === 'featured'
    ? 'approved'
    : remote.status === 'pending'
      ? 'pending'
      : 'rejected'

  return {
    id: remote.id,
    businessName: remote.business_name || remote.brand_name || remote.display_name || 'Vendor Business',
    category: remote.brand_name || 'General',
    description: remote.bio || '',
    status,
    phone: '',
    createdAt: remote.created_at || new Date().toISOString(),
  }
}

function mapProduct(remote: RemoteProduct): VendorProduct {
  return {
    id: remote.id,
    name: remote.name || 'Untitled Product',
    category: remote.category || 'Other',
    price: Number(remote.price || 0),
    originalPrice: remote.original_price ?? undefined,
    description: remote.description || '',
    shortDesc: remote.short_desc || '',
    images: parseJsonList(remote.images_json),
    video: remote.video || undefined,
    inStock: remote.in_stock === 0 ? false : Boolean(remote.in_stock ?? true),
    stockCount: remote.stock_count ?? undefined,
    badge: remote.badge || '',
    whatsapp: remote.whatsapp || undefined,
    features: parseJsonList(remote.features_json),
    variants: parseVariantList(remote.variants_json),
    active: remote.active === 0 ? false : Boolean(remote.active ?? true),
    status: remote.status || 'pending',
    addedAt: remote.added_at || new Date().toISOString(),
  }
}

function AccountVendorGate() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
          <Store className="w-7 h-7 text-brand-gold" />
        </div>
        <h1 className="text-2xl font-display font-bold gold-text">Vendor access is account-based</h1>
        <p className="text-brand-cream/55 text-sm mt-3">
          Sign in with your normal account, then open the vendor workspace from your account profile.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className="btn-gold">Sign in</Link>
          <Link href="/account" className="btn-outline-gold">Open My Account</Link>
        </div>
      </div>
    </div>
  )
}

function ProductPanel({
  product,
  onClose,
  onSubmit,
}: {
  product: VendorProduct | null
  onClose: () => void
  onSubmit: (form: ProductFormData) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  const initial: Partial<ProductFormData> = product
    ? {
        name: product.name,
        category: product.category,
        price: String(product.price),
        originalPrice: product.originalPrice ? String(product.originalPrice) : '',
        shortDesc: product.shortDesc || '',
        description: product.description,
        images: product.images,
        video: product.video || '',
        inStock: product.inStock,
        stockCount: product.stockCount ? String(product.stockCount) : '',
        badge: product.badge || '',
        whatsapp: product.whatsapp || '',
        features: product.features,
        variants: product.variants.map(variant => ({
          label: variant.label,
          options: variant.options.join(', '),
        })),
      }
    : {}

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[560px] bg-brand-black-2 border-l border-brand-gold/20 z-50 flex flex-col">
        <div className="px-5 py-4 border-b border-brand-gold/20 flex items-center justify-between">
          <h3 className="text-brand-cream font-display font-semibold">{product ? 'Edit Product' : 'Add Product'}</h3>
          <button onClick={onClose} className="text-brand-cream/40 hover:text-brand-cream"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <ProductForm
            initial={initial}
            loading={saving}
            submitLabel={saving ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
            onCancel={onClose}
            onSubmit={async form => {
              setSaving(true)
              try {
                await onSubmit(form)
                onClose()
              } finally {
                setSaving(false)
              }
            }}
          />
        </div>
      </div>
    </>
  )
}

export default function VendorDashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draftReply, setDraftReply] = useState('')

  const [tab, setTab] = useState<'products' | 'messages' | 'settings'>('products')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null)

  const [settingsForm, setSettingsForm] = useState({ businessName: '', category: '', description: '' })
  const [savingSettings, setSavingSettings] = useState(false)

  const activeConversation = useMemo(
    () => conversations.find(conversation => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations],
  )

  async function loadVendorData() {
    setLoading(true)
    setError(null)
    try {
      const profileResponse = await apiRequest<{ vendor?: RemoteVendor | null }>('/vendors/me')
      if (!profileResponse.ok) {
        throw new Error(profileResponse.error || 'Could not load vendor profile.')
      }

      const remoteVendor = profileResponse.data?.vendor ?? null
      const mappedVendor = remoteVendor ? mapVendor(remoteVendor) : null
      setVendor(mappedVendor)
      setSettingsForm({
        businessName: mappedVendor?.businessName || '',
        category: mappedVendor?.category || '',
        description: mappedVendor?.description || '',
      })

      if (!mappedVendor) {
        setProducts([])
        setConversations([])
        setMessages([])
        return
      }

      const [productResponse, conversationResponse] = await Promise.all([
        apiRequest<{ products?: RemoteProduct[] }>('/vendors/me/products'),
        apiRequest<{ conversations?: Conversation[] }>('/vendors/me/conversations'),
      ])

      if (productResponse.ok) {
        setProducts((productResponse.data?.products || []).map(mapProduct))
      } else {
        setProducts([])
      }

      if (conversationResponse.ok) {
        const list = conversationResponse.data?.conversations || []
        setConversations(list)
        setActiveConversationId(prev => prev || list[0]?.id || null)
      } else {
        setConversations([])
        setActiveConversationId(null)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load vendor dashboard.')
    } finally {
      setLoading(false)
    }
  }

  async function loadConversationMessages(conversationId: string) {
    const response = await apiRequest<{ messages?: ChatMessage[] }>(`/conversations/${encodeURIComponent(conversationId)}/messages`)
    if (!response.ok) {
      setMessages([])
      return
    }
    setMessages(response.data?.messages || [])
  }

  useEffect(() => {
    setMounted(true)
    const user = getCurrentUser()
    setUserEmail(user?.email ?? null)
    if (!user) {
      setLoading(false)
      return
    }
    void loadVendorData()
  }, [])

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }
    void loadConversationMessages(activeConversationId)
  }, [activeConversationId])

  async function handleSaveProduct(form: ProductFormData) {
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      description: form.description.trim(),
      shortDesc: form.shortDesc.trim(),
      images: form.images,
      video: form.video.trim() || null,
      inStock: form.inStock,
      stockCount: form.stockCount ? Number(form.stockCount) : null,
      badge: form.badge || null,
      whatsapp: form.whatsapp.trim() || null,
      features: form.features.filter(Boolean),
      variants: form.variants
        .filter(variant => variant.label.trim())
        .map(variant => ({
          label: variant.label.trim(),
          options: variant.options.split(',').map(option => option.trim()).filter(Boolean),
        })),
      weightKg: 0.5,
    }

    if (editingProduct) {
      await apiJson(`/vendors/me/products/${encodeURIComponent(editingProduct.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    } else {
      await apiJson('/vendors/me/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }

    await loadVendorData()
  }

  async function handleToggleProduct(product: VendorProduct) {
    await apiJson(`/vendors/me/products/${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !product.active }),
    })
    await loadVendorData()
  }

  async function handleDeleteProduct(productId: string) {
    await apiJson(`/vendors/me/products/${encodeURIComponent(productId)}`, { method: 'DELETE' })
    await loadVendorData()
  }

  async function handleSaveSettings() {
    if (!vendor) return
    setSavingSettings(true)
    try {
      await apiJson('/vendors/me', {
        method: 'PATCH',
        body: JSON.stringify({
          brandName: settingsForm.category,
          businessName: settingsForm.businessName,
          displayName: settingsForm.businessName,
          bio: settingsForm.description,
        }),
      })
      await loadVendorData()
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleSendReply() {
    if (!activeConversationId || !draftReply.trim()) return
    await apiJson(`/conversations/${encodeURIComponent(activeConversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: draftReply.trim() }),
    })
    setDraftReply('')
    await loadConversationMessages(activeConversationId)
    await loadVendorData()
  }

  if (!mounted) return null
  if (!userEmail) return <AccountVendorGate />

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black pt-24 px-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-20 bg-brand-black-2 rounded-xl animate-pulse" />
          <div className="h-80 bg-brand-black-2 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-brand-black-2 border border-red-500/30 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={() => { void loadVendorData() }} className="btn-gold mt-5">Retry</button>
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-display font-bold gold-text">No vendor profile yet</h1>
          <p className="text-brand-cream/55 text-sm mt-3">Apply first, then admin approval will unlock this dashboard.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/vendors/register" className="btn-gold">Apply as Vendor</Link>
            <Link href="/account" className="btn-outline-gold">Open My Account</Link>
          </div>
        </div>
      </div>
    )
  }

  if (vendor.status !== 'approved') {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-brand-black-2 border border-yellow-500/30 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-display font-bold gold-text">Vendor status: {vendor.status}</h1>
          <p className="text-brand-cream/55 text-sm mt-3">Your vendor profile exists but is not approved yet.</p>
          <Link href="/account" className="btn-gold mt-6 inline-flex">Go to My Account</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black pt-16 pb-16">
      <div className="sticky top-0 z-20 border-b border-brand-gold/20 bg-brand-black-2/95 backdrop-blur-md px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
              <Store className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <p className="text-brand-cream font-display font-semibold text-sm">{vendor.businessName}</p>
              <p className="text-green-400 text-xs">Approved vendor</p>
            </div>
          </div>
          <Link href="/account" className="text-brand-cream/45 hover:text-brand-gold text-sm inline-flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Back to account
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4">
            <p className="text-brand-cream/45 text-xs uppercase tracking-wider">Products</p>
            <p className="text-brand-gold text-2xl font-display font-bold mt-2">{products.length}</p>
          </div>
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4">
            <p className="text-brand-cream/45 text-xs uppercase tracking-wider">Active</p>
            <p className="text-green-400 text-2xl font-display font-bold mt-2">{products.filter(product => product.active).length}</p>
          </div>
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4">
            <p className="text-brand-cream/45 text-xs uppercase tracking-wider">Conversations</p>
            <p className="text-blue-400 text-2xl font-display font-bold mt-2">{conversations.length}</p>
          </div>
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4">
            <p className="text-brand-cream/45 text-xs uppercase tracking-wider">Unread</p>
            <p className="text-purple-400 text-2xl font-display font-bold mt-2">{conversations.reduce((sum, conversation) => sum + Number(conversation.unread_vendor || 0), 0)}</p>
          </div>
        </div>

        <div className="flex gap-1 bg-brand-black-2 border border-brand-gold/20 rounded-xl p-1 overflow-x-auto">
          {([
            ['products', 'Products'],
            ['messages', 'Messages'],
            ['settings', 'Settings'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${tab === id ? 'bg-gold-gradient text-brand-black font-semibold' : 'text-brand-cream/60 hover:text-brand-gold'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'products' && (
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-brand-cream font-display font-semibold">My Products</h2>
              <button
                onClick={() => { setEditingProduct(null); setPanelOpen(true) }}
                className="btn-gold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {products.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 text-brand-gold/20 mx-auto mb-4" />
                <p className="text-brand-cream/55">No products yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-gold/20">
                      {['Product', 'Category', 'Price', 'Views', 'Status', 'Actions'].map(col => (
                        <th key={col} className="text-left py-2.5 px-3 text-brand-gold/55 text-xs uppercase tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="border-b border-brand-gold/10 hover:bg-brand-gold/5">
                        <td className="py-3 px-3">
                          <p className="text-brand-cream font-medium">{product.name}</p>
                          <p className="text-brand-cream/40 text-xs">{product.id.slice(-8)}</p>
                        </td>
                        <td className="py-3 px-3 text-brand-cream/60">{product.category}</td>
                        <td className="py-3 px-3 text-brand-gold font-semibold">${product.price.toFixed(2)}</td>
                        <td className="py-3 px-3 text-brand-cream/60 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> n/a</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${product.active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                            {product.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => void handleToggleProduct(product)} className="text-brand-gold/60 hover:text-brand-gold" title="Toggle active">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditingProduct(product); setPanelOpen(true) }} className="text-brand-gold/60 hover:text-brand-gold" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => void handleDeleteProduct(product.id)} className="text-red-400/70 hover:text-red-400" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'messages' && (
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl overflow-hidden">
            <div className="grid md:grid-cols-[280px_1fr] min-h-[520px]">
              <div className="border-r border-brand-gold/20">
                <div className="px-4 py-3 border-b border-brand-gold/10 text-xs uppercase tracking-wider text-brand-gold">Conversations</div>
                <div className="max-h-[520px] overflow-y-auto">
                  {conversations.length === 0 && <div className="p-5 text-sm text-brand-cream/45">No conversations yet.</div>}
                  {conversations.map(conversation => {
                    const customerName = `${conversation.customer_first_name || ''} ${conversation.customer_last_name || ''}`.trim() || 'Customer'
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setActiveConversationId(conversation.id)}
                        className={`w-full text-left p-4 border-b border-brand-gold/10 ${activeConversationId === conversation.id ? 'bg-brand-gold/10' : 'hover:bg-brand-gold/5'}`}
                      >
                        <p className="text-sm text-brand-cream">{customerName}</p>
                        <p className="text-xs text-brand-cream/45 truncate">{conversation.subject || conversation.id}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="px-5 py-3 border-b border-brand-gold/10 text-sm text-brand-cream">
                  {activeConversation ? (activeConversation.subject || activeConversation.id) : 'Select a conversation'}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(message => (
                    <div key={message.id} className={`flex ${message.role === 'support' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${message.role === 'support' ? 'bg-brand-gold/15 border border-brand-gold/30 rounded-br-none text-brand-cream' : 'bg-brand-black-3 rounded-bl-none text-brand-cream/80'}`}>
                        <p>{message.text}</p>
                        <p className="text-[10px] mt-1 text-brand-cream/35">{new Date(message.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-brand-gold/10 flex items-center gap-2">
                  <input
                    value={draftReply}
                    onChange={event => setDraftReply(event.target.value)}
                    placeholder="Reply to customer..."
                    className="flex-1 px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white"
                  />
                  <button onClick={() => { void handleSendReply() }} className="btn-gold inline-flex items-center gap-2" disabled={!activeConversationId}>
                    <Send className="w-4 h-4" /> Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6 space-y-4 max-w-2xl">
            <h2 className="text-brand-cream font-display font-semibold">Vendor Profile</h2>
            <div>
              <label className="text-brand-cream/55 text-xs uppercase tracking-wider block mb-1.5">Business Name</label>
              <input value={settingsForm.businessName} onChange={event => setSettingsForm(prev => ({ ...prev, businessName: event.target.value }))} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm" />
            </div>
            <div>
              <label className="text-brand-cream/55 text-xs uppercase tracking-wider block mb-1.5">Category</label>
              <input value={settingsForm.category} onChange={event => setSettingsForm(prev => ({ ...prev, category: event.target.value }))} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm" />
            </div>
            <div>
              <label className="text-brand-cream/55 text-xs uppercase tracking-wider block mb-1.5">Description</label>
              <textarea value={settingsForm.description} onChange={event => setSettingsForm(prev => ({ ...prev, description: event.target.value }))} rows={4} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-xl px-4 py-3 text-brand-cream text-sm resize-none" />
            </div>
            <button onClick={() => { void handleSaveSettings() }} className="btn-gold inline-flex items-center gap-2" disabled={savingSettings}>
              <Save className="w-4 h-4" /> {savingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {panelOpen && (
        <ProductPanel
          product={editingProduct}
          onClose={() => setPanelOpen(false)}
          onSubmit={handleSaveProduct}
        />
      )}
    </div>
  )
}
