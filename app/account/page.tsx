'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Heart, MapPin, Settings, LayoutDashboard, Plus, Trash2, LogOut, Eye, Store, Package, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getCurrentUser, logoutUser, updateUser, addAddress, removeAddress,
  setDefaultAddress, changePassword, deleteAccount, getAdminLevel, isAdminUser,
  type User, type SavedAddress,
} from '@/lib/auth'
import { formatOrderDate, type Order } from '@/lib/orders'
import { getWishlist, loadWishlist, toggleWishlistForUser } from '@/lib/wishlist'
import { products, formatPrice } from '@/lib/products'
import { useStorefrontCatalog } from '@/lib/useStorefrontCatalog'
import { useCartStore } from '@/lib/store'
import { getRecentlyViewed } from '@/lib/recentlyViewed'
import { withApiBase } from '@/lib/site'
import { apiRequest } from '@/lib/remoteApi'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'business', label: 'Business', icon: Store },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

type Tab = typeof TABS[number]['id']

interface RemoteOrderRow {
  order_id: string
  date: string
  status?: string
  payment_status?: string
  payment_method?: string
  currency?: string
  subtotal_usd?: number
  shipping_usd?: number
  grand_total_usd?: number
  discount_usd?: number | null
  coupon_code?: string | null
  customer_json?: string | null
  shipping_json?: string | null
  notes?: string | null
  gift_message?: string | null
}

interface VendorProfile {
  id: string
  businessName: string
  category: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  phone: string
  whatsapp?: string
}

interface VendorProduct {
  id: string
  name: string
  category: string
  price: number
  active: boolean
}

interface VendorConversation {
  id: string
  unread_vendor?: number
}

function parseObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function mapRemoteOrder(row: RemoteOrderRow): Order {
  const customer = parseObject(row.customer_json)
  const shipping = parseObject(row.shipping_json)
  return {
    orderId: row.order_id,
    date: row.date ?? new Date().toISOString(),
    status: row.status === 'processing' || row.status === 'shipped' || row.status === 'delivered' ? row.status : 'pending',
    paymentStatus: row.payment_status === 'paid' ? 'paid' : 'pending',
    paymentMethod: typeof row.payment_method === 'string' ? row.payment_method : 'unknown',
    currency: row.currency === 'NGN' || row.currency === 'GHS' || row.currency === 'USD' || row.currency === 'CNY' ? row.currency : 'USD',
    items: [],
    subtotalUSD: Number(row.subtotal_usd ?? 0),
    shippingUSD: Number(row.shipping_usd ?? 0),
    grandTotalUSD: Number(row.grand_total_usd ?? 0),
    discountUSD: Number(row.discount_usd ?? 0) || undefined,
    couponCode: typeof row.coupon_code === 'string' ? row.coupon_code : undefined,
    customer: {
      firstName: typeof customer.firstName === 'string' ? customer.firstName : '',
      lastName: typeof customer.lastName === 'string' ? customer.lastName : '',
      email: typeof customer.email === 'string' ? customer.email : '',
      phone: typeof customer.phone === 'string' ? customer.phone : '',
    },
    shipping: {
      address: typeof shipping.address === 'string' ? shipping.address : '',
      city: typeof shipping.city === 'string' ? shipping.city : '',
      state: typeof shipping.state === 'string' ? shipping.state : '',
      country: typeof shipping.country === 'string' ? shipping.country : '',
      postalCode: typeof shipping.postalCode === 'string' ? shipping.postalCode : '',
    },
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    giftMessage: typeof row.gift_message === 'string' ? row.gift_message : undefined,
  }
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const tabVariants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export default function AccountPage() {
  const router = useRouter()
  const { currency, addItem } = useCartStore()
  const [user, setUser] = useState<User | null>(null)
  const [linkedVendor, setLinkedVendor] = useState<VendorProfile | null>(null)
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([])
  const [vendorUnreadMessages, setVendorUnreadMessages] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [userOrders, setUserOrders] = useState<Order[]>([])

  // Wishlist
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([])
  const liveCatalog = useStorefrontCatalog()

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addrLabel, setAddrLabel] = useState('')
  const [addrFirstName, setAddrFirstName] = useState('')
  const [addrLastName, setAddrLastName] = useState('')
  const [addrAddress, setAddrAddress] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrCountry, setAddrCountry] = useState<SavedAddress['country']>('Nigeria')
  const [addrPhone, setAddrPhone] = useState('')
  const [addrIsDefault, setAddrIsDefault] = useState(false)

  // Settings
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteZone, setShowDeleteZone] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const refreshUser = useCallback(() => {
    const u = getCurrentUser()
    setUser(u)
    if (u) {
      setEditFirstName(u.firstName)
      setEditLastName(u.lastName)
      setEditPhone(u.phone)
    }
    return u
  }, [])

  useEffect(() => {
    const u = refreshUser()
    setAuthChecked(true)
    if (!u) router.push('/login')
    void (async () => {
      setWishlistSlugs(await loadWishlist())
    })()
  }, [router, refreshUser])

  useEffect(() => {
    if (activeTab === 'wishlist') {
      void (async () => {
        setWishlistSlugs(await loadWishlist())
      })()
    }
  }, [activeTab])

  useEffect(() => {
    if (!user) return
    const loadOrders = async () => {
      try {
        const response = await fetch(withApiBase('/orders/me'), {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('remote unavailable')
        const payload = await response.json().catch(() => null) as { orders?: RemoteOrderRow[] } | null
        if (!payload?.orders) throw new Error('invalid payload')
        setUserOrders(payload.orders.map(mapRemoteOrder))
      } catch {
        setUserOrders([])
        toast.error('We could not load your order history right now. Please refresh and try again.')
      }
    }
    void loadOrders()
  }, [user])

  useEffect(() => {
    if (!user) {
      setLinkedVendor(null)
      setVendorProducts([])
      setVendorUnreadMessages(0)
      return
    }
    const loadVendor = async () => {
      const profileResponse = await apiRequest<{ vendor?: { id: string; brand_name?: string | null; business_name?: string | null; display_name?: string | null; bio?: string | null; status?: string | null } | null }>('/vendors/me')
      if (!profileResponse.ok || !profileResponse.data?.vendor) {
        setLinkedVendor(null)
        setVendorProducts([])
        setVendorUnreadMessages(0)
        return
      }
      const vendor = profileResponse.data.vendor
      const mappedVendor: VendorProfile = {
        id: vendor.id,
        businessName: vendor.business_name || vendor.brand_name || vendor.display_name || 'Vendor Business',
        category: vendor.brand_name || 'General',
        description: vendor.bio || '',
        status: vendor.status === 'approved' || vendor.status === 'featured' ? 'approved' : vendor.status === 'pending' ? 'pending' : 'rejected',
        phone: user.phone,
        whatsapp: user.phone,
      }
      setLinkedVendor(mappedVendor)

      if (mappedVendor.status !== 'approved') {
        setVendorProducts([])
        setVendorUnreadMessages(0)
        return
      }

      const [productsResponse, conversationsResponse] = await Promise.all([
        apiRequest<{ products?: Array<{ id: string; name?: string; category?: string; price?: number; active?: number | boolean | null }> }>('/vendors/me/products'),
        apiRequest<{ conversations?: VendorConversation[] }>('/vendors/me/conversations'),
      ])

      if (productsResponse.ok) {
        setVendorProducts(
          (productsResponse.data?.products || []).map(product => ({
            id: product.id,
            name: product.name || 'Untitled Product',
            category: product.category || 'Other',
            price: Number(product.price || 0),
            active: product.active === 0 ? false : Boolean(product.active ?? true),
          })),
        )
      } else {
        setVendorProducts([])
      }

      if (conversationsResponse.ok) {
        const unread = (conversationsResponse.data?.conversations || []).reduce(
          (sum, conversation) => sum + Number(conversation.unread_vendor || 0),
          0,
        )
        setVendorUnreadMessages(unread)
      } else {
        setVendorUnreadMessages(0)
      }
    }
    void loadVendor()
  }, [user])

  const recentlyViewedCount = typeof window !== 'undefined'
    ? getRecentlyViewed().length
    : 0

  const catalogForWishlist = liveCatalog.length > 0 ? liveCatalog : (products as typeof liveCatalog)
  const wishlistProducts = catalogForWishlist.filter(p => wishlistSlugs.includes(p.slug))
  const vendorTotalViews = 0

  async function handleRemoveWishlist(slug: string) {
    await toggleWishlistForUser(slug)
    setWishlistSlugs(getWishlist())
    toast.success('Removed from wishlist')
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      await updateUser({ firstName: editFirstName, lastName: editLastName, phone: editPhone })
      refreshUser()
      toast.success('Profile updated!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (newPw !== confirmPw) { toast.error('New passwords do not match'); return }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setChangingPw(true)
    try {
      await changePassword(currentPw, newPw)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      toast.success('Password changed!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  function handleLogout() {
    logoutUser()
    router.push('/')
  }

  function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return }
    deleteAccount()
    router.push('/')
  }

  function handleAddAddress() {
    try {
      addAddress({
        label: addrLabel, firstName: addrFirstName, lastName: addrLastName,
        address: addrAddress, city: addrCity, country: addrCountry,
        phone: addrPhone, isDefault: addrIsDefault,
      })
      refreshUser()
      setShowAddressForm(false)
      setAddrLabel(''); setAddrFirstName(''); setAddrLastName(''); setAddrAddress('')
      setAddrCity(''); setAddrCountry('Nigeria'); setAddrPhone(''); setAddrIsDefault(false)
      toast.success('Address saved!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save address')
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-brand-black pt-32 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-brand-black-2 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-brand-black pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl gold-text">{user.avatar || '👑'} My Account</h1>
          <p className="font-body text-sm text-brand-cream/50 mt-1">{user.email}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {linkedVendor && (
              <span className={`px-3 py-1 rounded-full border text-xs font-body font-semibold uppercase tracking-wider ${
                linkedVendor.status === 'approved'
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : linkedVendor.status === 'pending'
                    ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                vendor {linkedVendor.status}
              </span>
            )}
            {isAdminUser(user) && (
              <>
              <span className="px-3 py-1 rounded-full border border-brand-gold/30 bg-brand-gold/10 text-brand-gold text-xs font-body font-semibold uppercase tracking-wider">
                {getAdminLevel(user)?.replace('-', ' ') ?? 'admin'} access enabled
              </span>
              <Link href="/admin" className="inline-flex items-center gap-2 btn-outline-gold">
                <LayoutDashboard size={16} />
                Open Admin Panel
              </Link>
              </>
            )}
          </div>
        </div>

        {/* Sticky Tab bar */}
        <div className="sticky top-20 z-30 bg-brand-black/95 backdrop-blur-md border-b border-brand-gold/20 mb-8 -mx-4 px-4">
          <div className="flex overflow-x-auto gap-1 pb-px">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-body text-sm whitespace-nowrap transition-all duration-200 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-brand-gold text-brand-gold'
                      : 'border-transparent text-brand-cream/50 hover:text-brand-cream'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                  <h2 className="font-display text-2xl gold-text mb-1">Welcome back, {user.firstName}! 👑</h2>
                  <p className="font-body text-sm text-brand-cream/50">Here&apos;s your account overview</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Orders', value: userOrders.length, icon: '🛍️' },
                    { label: 'Wishlist Items', value: wishlistSlugs.length, icon: '❤️' },
                    { label: 'Recently Viewed', value: recentlyViewedCount, icon: '👁️' },
                    { label: 'Member Since', value: new Date(user.createdAt).getFullYear(), icon: '🎀' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-4">
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <p className="font-display text-2xl text-brand-gold font-bold">{stat.value}</p>
                      <p className="font-body text-xs text-brand-cream/50 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent orders */}
                <div>
                  <h3 className="font-heading text-lg text-brand-gold mb-4">Recent Orders</h3>
                  {userOrders.length === 0 ? (
                    <div className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-8 text-center">
                      <p className="text-3xl mb-2">🛍️</p>
                      <p className="font-body text-sm text-brand-cream/50">No orders yet. Time to treat yourself!</p>
                      <Link href="/shop" className="btn-gold mt-4 inline-block text-sm">Browse Shop →</Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userOrders.slice(0, 3).map(order => (
                        <div key={order.orderId} className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-body text-sm font-bold text-brand-gold">#{order.orderId}</p>
                            <p className="font-body text-xs text-brand-cream/50">{formatOrderDate(order.date)} · {order.items.length} item(s)</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-body font-semibold px-2 py-1 rounded-full border ${statusColors[order.status] || ''}`}>
                              {order.status}
                            </span>
                            <span className="font-heading font-bold text-brand-gold-3 text-sm">${order.grandTotalUSD.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                  <Link href="/shop" className="bg-brand-black-2 border border-brand-gold/10 hover:border-brand-gold/30 rounded-xl p-4 text-center transition-all group">
                    <p className="text-2xl mb-1">🛍️</p>
                    <p className="font-body text-xs text-brand-cream/60 group-hover:text-brand-cream">Browse Shop</p>
                  </Link>
                  <Link href="/wishlist" className="bg-brand-black-2 border border-brand-gold/10 hover:border-brand-gold/30 rounded-xl p-4 text-center transition-all group">
                    <p className="text-2xl mb-1">❤️</p>
                    <p className="font-body text-xs text-brand-cream/60 group-hover:text-brand-cream">My Wishlist</p>
                  </Link>
                  <Link href="/track-order" className="bg-brand-black-2 border border-brand-gold/10 hover:border-brand-gold/30 rounded-xl p-4 text-center transition-all group">
                    <p className="text-2xl mb-1">📦</p>
                    <p className="font-body text-xs text-brand-cream/60 group-hover:text-brand-cream">Track Order</p>
                  </Link>
                  <button
                    onClick={() => setActiveTab('business')}
                    className="bg-brand-black-2 border border-brand-gold/10 hover:border-brand-gold/30 rounded-xl p-4 text-center transition-all group"
                  >
                    <p className="text-2xl mb-1">🏪</p>
                    <p className="font-body text-xs text-brand-cream/60 group-hover:text-brand-cream">Vendor Hub</p>
                  </button>
                  {isAdminUser(user) && (
                    <Link href="/admin" className="bg-brand-black-2 border border-brand-gold/10 hover:border-brand-gold/30 rounded-xl p-4 text-center transition-all group">
                      <p className="text-2xl mb-1">🛡️</p>
                      <p className="font-body text-xs text-brand-cream/60 group-hover:text-brand-cream">Admin Panel</p>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* ── BUSINESS ── */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="section-label">Business Hub</p>
                      <h2 className="font-display text-2xl gold-text">
                        {linkedVendor?.businessName ?? 'Sell with Taries Beauty Emporium'}
                      </h2>
                      <p className="font-body text-sm text-brand-cream/50 mt-1">
                        Manage vendor access, products, customer chats, and business details from your main account profile.
                      </p>
                    </div>
                    {linkedVendor?.status === 'approved' ? (
                      <Link href="/vendors/dashboard" className="btn-gold inline-flex items-center gap-2">
                        <Store size={16} />
                        Open Vendor Workspace
                      </Link>
                    ) : (
                      <Link href="/vendors/register" className="btn-outline-gold inline-flex items-center gap-2">
                        <Plus size={16} />
                        {linkedVendor ? 'Update Vendor Application' : 'Apply as Vendor'}
                      </Link>
                    )}
                  </div>
                </div>

                {!linkedVendor && (
                  <div className="bg-brand-black-2 border border-brand-gold/10 rounded-2xl p-8">
                    <h3 className="font-heading text-lg text-brand-gold mb-2">Start selling from this account</h3>
                    <p className="font-body text-sm text-brand-cream/55 max-w-2xl">
                      Vendor access is now connected to your signed-in customer profile. Apply once, get approved by admin, and your vendor tools will appear here without a separate vendor login.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link href="/vendors/register" className="btn-gold">Apply as Vendor</Link>
                      <Link href="/contact" className="btn-outline-gold">Contact Support</Link>
                    </div>
                  </div>
                )}

                {linkedVendor && linkedVendor.status !== 'approved' && (
                  <div className={`rounded-2xl p-6 border ${
                    linkedVendor.status === 'pending'
                      ? 'bg-yellow-500/5 border-yellow-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-heading text-lg text-brand-gold mb-2">Vendor application status</h3>
                        <p className="font-body text-sm text-brand-cream/60">
                          Your current vendor request for <span className="text-brand-cream">{linkedVendor.businessName}</span> is <span className="capitalize">{linkedVendor.status}</span>.
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${
                        linkedVendor.status === 'pending'
                          ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                          : 'border-red-500/30 bg-red-500/10 text-red-400'
                      }`}>
                        {linkedVendor.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                      <div className="bg-brand-black/30 rounded-xl p-4 border border-brand-gold/10">
                        <p className="font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-2">Business details</p>
                        <p className="font-body text-sm text-brand-cream">{linkedVendor.businessName}</p>
                        <p className="font-body text-xs text-brand-cream/55 mt-1">{linkedVendor.category}</p>
                        <p className="font-body text-xs text-brand-cream/45 mt-3">{linkedVendor.description}</p>
                      </div>
                      <div className="bg-brand-black/30 rounded-xl p-4 border border-brand-gold/10">
                        <p className="font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-2">What happens next</p>
                        <p className="font-body text-sm text-brand-cream/60">
                          Admin reviews vendor requests from the main admin panel. Once approved, your full vendor workspace opens directly from this profile.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {linkedVendor?.status === 'approved' && (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Listed Products', value: vendorProducts.length, icon: Package },
                        { label: 'Product Views', value: vendorTotalViews, icon: Eye },
                        { label: 'Unread Messages', value: vendorUnreadMessages, icon: MessageCircle },
                        { label: 'Status', value: 'Approved', icon: Store },
                      ].map(stat => {
                        const Icon = stat.icon
                        return (
                          <div key={stat.label} className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-body text-xs text-brand-cream/45 uppercase tracking-wider">{stat.label}</p>
                              <Icon size={15} className="text-brand-gold" />
                            </div>
                            <p className="font-display text-2xl text-brand-gold font-bold">{stat.value}</p>
                          </div>
                        )
                      })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6">
                      <div className="bg-brand-black-2 border border-brand-gold/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <h3 className="font-heading text-lg text-brand-gold">Recent Vendor Products</h3>
                          <Link href="/vendors/dashboard" className="text-xs text-brand-gold/70 hover:text-brand-gold transition-colors">
                            Manage all
                          </Link>
                        </div>

                        {vendorProducts.length === 0 ? (
                          <div className="border border-dashed border-brand-gold/20 rounded-xl p-6 text-center">
                            <p className="font-body text-sm text-brand-cream/55">No vendor products yet.</p>
                            <Link href="/vendors/dashboard" className="btn-gold mt-4 inline-flex">Add Your First Product</Link>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {vendorProducts.slice(0, 4).map(product => (
                              <div key={product.id} className="flex items-center justify-between gap-4 rounded-xl border border-brand-gold/10 bg-brand-black/30 p-4">
                                <div className="min-w-0">
                                  <p className="font-body text-sm text-brand-cream truncate">{product.name}</p>
                                  <p className="font-body text-xs text-brand-cream/45 mt-1">
                                    {product.category} · ${product.price.toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`font-body text-xs mt-1 ${product.active ? 'text-green-400' : 'text-brand-cream/35'}`}>
                                    {product.active ? 'Active' : 'Inactive'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="bg-brand-black-2 border border-brand-gold/10 rounded-2xl p-6">
                          <h3 className="font-heading text-lg text-brand-gold mb-4">Business Profile</h3>
                          <div className="space-y-3 text-sm">
                            <div>
                              <p className="font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Business Name</p>
                              <p className="font-body text-brand-cream">{linkedVendor.businessName}</p>
                            </div>
                            <div>
                              <p className="font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Category</p>
                              <p className="font-body text-brand-cream">{linkedVendor.category}</p>
                            </div>
                            <div>
                              <p className="font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Contact</p>
                              <p className="font-body text-brand-cream">{linkedVendor.whatsapp ?? linkedVendor.phone}</p>
                            </div>
                            <div>
                              <p className="font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Description</p>
                              <p className="font-body text-brand-cream/60">{linkedVendor.description}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-brand-black-2 border border-brand-gold/10 rounded-2xl p-6">
                          <h3 className="font-heading text-lg text-brand-gold mb-4">Workspace Access</h3>
                          <p className="font-body text-sm text-brand-cream/55">
                            Your vendor tools are linked to this account now. Open the workspace anytime without a separate vendor login page.
                          </p>
                          <div className="mt-5 flex flex-col gap-3">
                            <Link href="/vendors/dashboard" className="btn-gold text-center">Open Vendor Workspace</Link>
                            {isAdminUser(user) ? (
                              <Link href="/admin" className="btn-outline-gold text-center">
                                Open Admin Panel
                              </Link>
                            ) : (
                              <Link href="/contact" className="btn-outline-gold text-center">
                                Contact Admin Support
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ORDERS ── */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="font-heading text-xl text-brand-gold">My Orders</h2>
                {userOrders.length === 0 ? (
                  <div className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-12 text-center">
                    <p className="text-4xl mb-3">🛍️</p>
                    <p className="font-body text-brand-cream/60 mb-4">No orders yet. Start shopping!</p>
                    <Link href="/shop" className="btn-gold">Browse Shop →</Link>
                  </div>
                ) : (
                  userOrders.map(order => (
                    <div key={order.orderId} className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-body text-base font-bold text-brand-gold">#{order.orderId}</p>
                          <p className="font-body text-xs text-brand-cream/50 mt-0.5">{formatOrderDate(order.date)}</p>
                          <p className="font-body text-xs text-brand-cream/40 mt-0.5">{order.items.length} item(s)</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-xs font-body font-semibold px-2.5 py-1 rounded-full border ${statusColors[order.status] || ''}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                          <span className="font-heading font-bold text-brand-gold-3">${order.grandTotalUSD.toFixed(2)}</span>
                          <Link
                            href={`/invoice?orderId=${order.orderId}`}
                            className="flex items-center gap-1.5 text-brand-gold/70 hover:text-brand-gold text-xs font-body transition-colors"
                          >
                            <Eye size={13} /> View Invoice
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── WISHLIST ── */}
            {activeTab === 'wishlist' && (
              <div>
                <h2 className="font-heading text-xl text-brand-gold mb-6">My Wishlist</h2>
                {wishlistProducts.length === 0 ? (
                  <div className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-12 text-center">
                    <p className="text-4xl mb-3">💝</p>
                    <p className="font-body text-brand-cream/60 mb-4">Your wishlist is empty</p>
                    <Link href="/shop" className="btn-gold">Discover Products →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {wishlistProducts.map(product => (
                      <div key={product.id} className="bg-brand-black-2 border border-brand-gold/10 rounded-xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.images[0]} alt={product.name} className="w-full h-40 object-cover" />
                        <div className="p-3">
                          <p className="font-body text-sm text-brand-cream truncate">{product.name}</p>
                          <p className="font-heading font-bold text-brand-gold text-sm mt-1">{formatPrice(product.price, currency)}</p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => { addItem(product); toast.success('Added to cart!') }}
                              className="flex-1 btn-gold text-xs py-1.5"
                            >
                              Add to Cart
                            </button>
                            <button
                              onClick={() => handleRemoveWishlist(product.slug)}
                              className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ADDRESSES ── */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-xl text-brand-gold">Saved Addresses</h2>
                  <button
                    onClick={() => setShowAddressForm(v => !v)}
                    className="flex items-center gap-1.5 btn-outline-gold text-sm py-2"
                  >
                    <Plus size={14} /> Add New
                  </button>
                </div>

                <AnimatePresence>
                  {showAddressForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-brand-black-2 border border-brand-gold/30 rounded-xl p-5 space-y-4">
                        <h3 className="font-heading text-base text-brand-gold">Add New Address</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Label</label>
                            <input value={addrLabel} onChange={e => setAddrLabel(e.target.value)} placeholder="Home, Office..." className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Country</label>
                            <select value={addrCountry} onChange={e => setAddrCountry(e.target.value as SavedAddress['country'])} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold">
                              {(['Nigeria', 'Ghana', 'China', 'Other'] as const).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">First Name</label>
                            <input value={addrFirstName} onChange={e => setAddrFirstName(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Last Name</label>
                            <input value={addrLastName} onChange={e => setAddrLastName(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                          </div>
                        </div>
                        <div>
                          <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Street Address</label>
                          <input value={addrAddress} onChange={e => setAddrAddress(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">City</label>
                            <input value={addrCity} onChange={e => setAddrCity(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                          </div>
                          <div>
                            <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Phone</label>
                            <input value={addrPhone} onChange={e => setAddrPhone(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={addrIsDefault} onChange={e => setAddrIsDefault(e.target.checked)} className="accent-brand-gold" />
                          <span className="font-body text-sm text-brand-cream/70">Set as default address</span>
                        </label>
                        <div className="flex gap-3">
                          <button onClick={handleAddAddress} className="btn-gold flex-1">Save Address</button>
                          <button onClick={() => setShowAddressForm(false)} className="btn-outline-gold flex-1">Cancel</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {user.addresses.length === 0 ? (
                  <div className="bg-brand-black-2 border border-brand-gold/10 rounded-xl p-8 text-center">
                    <p className="text-3xl mb-2">📍</p>
                    <p className="font-body text-sm text-brand-cream/50">No saved addresses yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.addresses.map(addr => (
                      <div key={addr.id} className={`bg-brand-black-2 rounded-xl p-4 border transition-all ${addr.isDefault ? 'border-brand-gold' : 'border-brand-gold/10'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-body text-xs font-semibold px-2 py-0.5 bg-brand-gold/10 text-brand-gold-2 rounded-full border border-brand-gold/20">{addr.label}</span>
                                {addr.isDefault && <span className="font-body text-xs px-2 py-0.5 bg-brand-gold/20 text-brand-gold rounded-full border border-brand-gold/40">Default</span>}
                              </div>
                              <p className="font-body text-sm text-brand-cream mt-1.5">{addr.firstName} {addr.lastName}</p>
                              <p className="font-body text-xs text-brand-cream/60">{addr.address}, {addr.city}, {addr.country}</p>
                              <p className="font-body text-xs text-brand-cream/50">{addr.phone}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {!addr.isDefault && (
                              <button
                                onClick={() => { setDefaultAddress(addr.id); refreshUser(); toast.success('Default address updated') }}
                                className="text-xs font-body text-brand-gold/60 hover:text-brand-gold transition-colors whitespace-nowrap"
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              onClick={() => { removeAddress(addr.id); refreshUser(); toast.success('Address removed') }}
                              className="text-xs font-body text-red-400/60 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-xl">
                {/* Edit Profile */}
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
                  <h3 className="font-heading text-base text-brand-gold mb-4">Edit Profile</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">First Name</label>
                        <input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                      </div>
                      <div>
                        <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Last Name</label>
                        <input value={editLastName} onChange={e => setEditLastName(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                      </div>
                    </div>
                    <div>
                      <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Phone</label>
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                    </div>
                    <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-gold disabled:opacity-60">
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                  <p className="font-body text-xs text-brand-cream/30 mt-3">
                    Member since {formatOrderDate(user.createdAt)}
                  </p>
                </div>

                {/* Change Password */}
                <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
                  <h3 className="font-heading text-base text-brand-gold mb-4">Change Password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Current Password</label>
                      <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                    </div>
                    <div>
                      <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">New Password</label>
                      <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                    </div>
                    <div>
                      <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">Confirm New Password</label>
                      <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold" />
                    </div>
                    <button onClick={handleChangePassword} disabled={changingPw} className="btn-gold disabled:opacity-60">
                      {changingPw ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>

                {/* Log Out */}
                <button onClick={handleLogout} className="btn-outline-gold w-full flex items-center justify-center gap-2">
                  <LogOut size={16} /> Log Out
                </button>

                {/* Danger Zone */}
                <div className="border border-red-500/30 rounded-xl p-5">
                  <h3 className="font-heading text-base text-red-400 mb-2">Danger Zone</h3>
                  <p className="font-body text-xs text-brand-cream/50 mb-4">Permanently delete your account and all data. This cannot be undone.</p>
                  {!showDeleteZone ? (
                    <button
                      onClick={() => setShowDeleteZone(true)}
                      className="font-body text-sm text-red-400 border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="font-body text-xs text-red-400">Type <strong>DELETE</strong> to confirm:</p>
                      <input
                        value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                        className="w-full bg-red-500/5 border border-red-500/30 rounded-lg px-3 py-2 font-body text-sm text-brand-cream focus:outline-none focus:border-red-500"
                        placeholder="DELETE"
                      />
                      <div className="flex gap-3">
                        <button onClick={handleDeleteAccount} className="flex-1 font-body text-sm font-semibold bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors">
                          Confirm Delete
                        </button>
                        <button onClick={() => { setShowDeleteZone(false); setDeleteConfirm('') }} className="flex-1 btn-outline-gold text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
