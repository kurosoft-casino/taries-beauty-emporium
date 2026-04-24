'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import {
  LayoutDashboard, Package, Users, Tag, Store, BarChart2, Boxes, Settings,
  LogOut, Lock, Search, Eye, Pencil, Trash2, Check, X, ChevronUp, ChevronDown,
  ExternalLink, Phone, Download, AlertTriangle, Plus, MessageCircle,
} from 'lucide-react'
import { getAllOrders, updateOrderStatus, formatOrderDate } from '@/lib/orders'
import type { Order } from '@/lib/orders'
import { products } from '@/lib/products'
import type { Product } from '@/lib/products'
import { getAllViewsSorted } from '@/lib/views'
import { getInventory, setInventoryItem } from '@/lib/inventory'
import type { InventoryItem } from '@/lib/inventory'
import { ADMIN_EMAILS, getAdminLevel, getCurrentUser, isAdminUser, type AdminLevel, type User } from '@/lib/auth'
import { logoSrc } from '@/lib/assets'
import { useLang } from '@/lib/lang'
import { DEFAULT_STORE_SETTINGS, getMaintenanceMode, getStoreSettings, saveMaintenanceMode, saveStoreSettings } from '@/lib/storeSettings'
import { appendAuditEvent, getAdminRoleLabel, readSupportThreads } from '@/lib/adminConsole'
import { AuditLogTab, MarketingTab, SupportInboxTab } from '@/components/admin/OperationsTabs'

// ── Types ─────────────────────────────────────────────────────────────────────
type TabId = 'dashboard' | 'orders' | 'users' | 'products' | 'vendors' | 'analytics' | 'inventory' | 'support' | 'marketing' | 'audit' | 'settings'
type AdminUser = User & { suspended?: boolean }
type StatusFilterOption = Order['status'] | 'all' | 'cancelled'

interface Vendor {
  id: string; businessName: string; ownerName: string; email: string; phone: string
  category: string; description: string; status: 'pending' | 'approved' | 'rejected'
  appliedAt: string; feeStatus: 'unpaid' | 'paid'
}
interface ProductOverride {
  name?: string; shortDesc?: string; price?: number; originalPrice?: number
  inStock?: boolean; badge?: 'new' | 'sale' | 'hot' | 'bestseller'
}
interface StoreSettings { storeName: string; whatsapp: string; email: string; announcement: string }
interface VendorProduct {
  id: string; name: string; vendorId: string; vendorName?: string; category: string
  price: number; status: 'pending' | 'approved' | 'featured' | 'removed'; createdAt: string
}

const adminTranslations = {
  EN: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    users: 'Users',
    products: 'Products',
    vendors: 'Vendors',
    analytics: 'Analytics',
    inventory: 'Inventory',
    support: 'Support',
    marketing: 'Marketing',
    audit: 'Audit Log',
    settings: 'Settings',
    adminPanel: 'Admin Panel',
    adminShort: 'Admin',
    logout: 'Log Out',
    localDataNotice: 'Registered users, orders, and vendor records on this GitHub Pages build are stored in this browser. This dashboard shows the accounts created or used on this device.',
    usersNotice: 'This list shows accounts currently stored in this browser for the live site. If another device registered a user, it will not appear here until account data is moved to the backend.',
    totalRevenue: 'Total Revenue',
    totalOrders: 'Total Orders',
    totalUsers: 'Total Users',
    onlineNow: 'Online Now',
    supportInbox: 'Support Inbox',
    pendingVendors: 'Pending Vendors',
    ordersCount: 'orders',
    pendingCount: 'pending',
    onlineCount: 'online',
    last15Min: 'last 15 min',
    needResponse: 'need response',
    awaitingReview: 'awaiting review',
    recentActivity: 'Recent Activity',
    registered: 'registered',
    noActivityYet: 'No activity yet',
    topProductsByViews: 'Top Products by Views',
    noViewDataYet: 'No view data yet',
    quickActions: 'Quick Actions',
    exportCsv: 'Export CSV',
    registeredUsers: 'Registered Users',
    broadcastsPromos: 'Broadcasts & Promos',
    manageProducts: 'Manage Products',
  },
  ZH: {
    dashboard: '控制台',
    orders: '订单',
    users: '用户',
    products: '产品',
    vendors: '商家',
    analytics: '数据分析',
    inventory: '库存',
    support: '客服',
    marketing: '营销',
    audit: '审计日志',
    settings: '设置',
    adminPanel: '管理后台',
    adminShort: '管理',
    logout: '退出登录',
    localDataNotice: '当前 GitHub Pages 版本中的用户、订单和商家数据保存在此浏览器中。此控制台显示的是在本设备上创建或使用过的账户数据。',
    usersNotice: '此列表显示当前浏览器中保存的站点账户。如果其他设备注册了用户，在账户数据迁移到后端前，这里不会显示。',
    totalRevenue: '总收入',
    totalOrders: '总订单数',
    totalUsers: '总用户数',
    onlineNow: '当前在线',
    supportInbox: '客服收件箱',
    pendingVendors: '待审核商家',
    ordersCount: '笔订单',
    pendingCount: '待处理',
    onlineCount: '在线',
    last15Min: '最近15分钟',
    needResponse: '待回复',
    awaitingReview: '等待审核',
    recentActivity: '最近动态',
    registered: '已注册',
    noActivityYet: '暂无动态',
    topProductsByViews: '浏览量最高的产品',
    noViewDataYet: '暂无浏览数据',
    quickActions: '快捷操作',
    exportCsv: '导出 CSV',
    registeredUsers: '注册用户',
    broadcastsPromos: '广播与优惠活动',
    manageProducts: '管理产品',
  },
} as const

function useAdminText() {
  const { lang } = useLang()
  return adminTranslations[lang]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered'] as const
const STATUS_FILTER_OPTIONS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
function getAdminPin(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('taries-admin-pin') || ''
}
function readUsers(): AdminUser[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem('taries-users'); return r ? (JSON.parse(r) as AdminUser[]) : [] } catch { return [] }
}
function saveAdminUsers(users: AdminUser[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('taries-users', JSON.stringify(users)) } catch { /* ignore */ }
}
function readVendors(): Vendor[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem('taries-vendors'); return r ? (JSON.parse(r) as Vendor[]) : [] } catch { return [] }
}
function saveVendors(vendors: Vendor[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('taries-vendors', JSON.stringify(vendors)) } catch { /* ignore */ }
}
function isOnline(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const ts = localStorage.getItem(`taries-presence-${userId}`)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < 15 * 60 * 1000
  } catch { return false }
}
function exportBlob(data: string, filename: string, type: string): void {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
function ordersToCSV(ordList: Order[]): string {
  const header = ['Order ID','Date','Customer','Email','Phone','Items','Total USD','Status','Payment']
  const rows = ordList.map(o => [
    o.orderId, formatOrderDate(o.date),
    `${o.customer.firstName} ${o.customer.lastName}`,
    o.customer.email, o.customer.phone,
    String(o.items.reduce((s, i) => s + i.quantity, 0)),
    `$${o.grandTotalUSD.toFixed(2)}`, o.status, o.paymentStatus,
  ])
  return [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
}
function getVendorProducts(): VendorProduct[] {
  if (typeof window === 'undefined') return []
  const result: VendorProduct[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const match = key.match(/^taries-vendor-(.+)-products$/)
      if (!match) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const items = JSON.parse(raw) as VendorProduct[]
      result.push(...items.map(p => ({ ...p, vendorId: match[1] })))
    }
  } catch { /* ignore */ }
  return result
}
function saveVendorProductStatus(vendorId: string, productId: string, status: VendorProduct['status']): void {
  if (typeof window === 'undefined') return
  try {
    const key = `taries-vendor-${vendorId}-products`
    const raw = localStorage.getItem(key)
    if (!raw) return
    const items = JSON.parse(raw) as VendorProduct[]
    localStorage.setItem(key, JSON.stringify(items.map(p => p.id === productId ? { ...p, status } : p)))
  } catch { /* ignore */ }
}

function recordAdminAction(action: string, target: string, detail?: string) {
  appendAuditEvent({
    actor: getCurrentUser()?.email ?? 'unknown-admin',
    action,
    target,
    detail,
  })
}

const statusColor: Record<Order['status'], string> = {
  pending:    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  processing: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  shipped:    'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  delivered:  'bg-green-500/20 text-green-400 border border-green-500/30',
}
const PAGE_SIZE = 20

// ── PinEntry ──────────────────────────────────────────────────────────────────
function PinEntry({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [error, setError] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupForm, setSetupForm] = useState({ next: '', confirm: '' })
  const [setupError, setSetupError] = useState('')

  useEffect(() => {
    setNeedsSetup(!getAdminPin())
  }, [])

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 6) return
    const next = pin + d
    setPin(next); setError(false)
    if (next.length === 6) {
      if (next === getAdminPin()) {
        setTimeout(() => onSuccess(), 300)
      } else {
        setShake(true); setError(true)
        setTimeout(() => { setPin(''); setShake(false); setError(false) }, 700)
      }
    }
  }, [pin, onSuccess])

  const handleBack = useCallback(() => { setPin(p => p.slice(0, -1)); setError(false) }, [])
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  function handleSetup() {
    if (!/^\d{6}$/.test(setupForm.next)) {
      setSetupError('Create a secure 6-digit admin PIN')
      return
    }
    if (setupForm.next !== setupForm.confirm) {
      setSetupError('PINs do not match')
      return
    }
    localStorage.setItem('taries-admin-pin', setupForm.next)
    toast.success('Admin PIN created')
    onSuccess()
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src={logoSrc} alt="Taries Beauty" width={72} height={72} unoptimized
              className="rounded-full mx-auto mb-4 border-2 border-brand-gold shadow-gold" />
            <p className="text-xs tracking-widest text-brand-gold/60 uppercase mb-1">First-Time Setup</p>
            <h1 className="text-2xl font-display font-bold gold-text">Create Admin PIN</h1>
          </div>
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 shadow-gold space-y-4">
            <input
              type="password"
              maxLength={6}
              value={setupForm.next}
              onChange={e => { setSetupForm(form => ({ ...form, next: e.target.value.replace(/\D/g, '').slice(0, 6) })); setSetupError('') }}
              placeholder="New 6-digit PIN"
              className="w-full px-4 py-3 bg-brand-black-3 border border-brand-gold/20 rounded-xl text-white focus:outline-none focus:border-brand-gold/50 tracking-[0.4em]"
            />
            <input
              type="password"
              maxLength={6}
              value={setupForm.confirm}
              onChange={e => { setSetupForm(form => ({ ...form, confirm: e.target.value.replace(/\D/g, '').slice(0, 6) })); setSetupError('') }}
              placeholder="Confirm PIN"
              className="w-full px-4 py-3 bg-brand-black-3 border border-brand-gold/20 rounded-xl text-white focus:outline-none focus:border-brand-gold/50 tracking-[0.4em]"
            />
            {setupError && <p className="text-red-400 text-xs">{setupError}</p>}
            <button onClick={handleSetup} className="btn-gold w-full">Save Admin PIN</button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src={logoSrc} alt="Taries Beauty" width={72} height={72} unoptimized
            className="rounded-full mx-auto mb-4 border-2 border-brand-gold shadow-gold" />
          <p className="text-xs tracking-widest text-brand-gold/60 uppercase mb-1">Restricted Area</p>
          <h1 className="text-2xl font-display font-bold gold-text">Admin Access</h1>
        </div>
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 shadow-gold">
          <div className="flex items-center justify-center gap-3 mb-8">
              <Lock className="w-4 h-4 text-brand-gold/50" />
              <motion.div animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }} className="flex gap-4">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                  i < pin.length ? (error ? 'bg-red-500 border-red-500' : 'bg-brand-gold border-brand-gold') : 'border-brand-gold/30'
                }`} />
              ))}
            </motion.div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {keys.map((key, idx) =>
              key === '' ? <div key={idx} /> : (
                <button key={idx} onClick={() => key === '⌫' ? handleBack() : handleDigit(key)}
                  className="py-4 rounded-xl text-xl font-body font-semibold bg-brand-black-3 text-white hover:bg-brand-gold hover:text-black transition-all border border-brand-gold/10 active:scale-95">
                  {key}
                </button>
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function AdminAccountGate({ user }: { user: User | null }) {
  const allowedEmails = ADMIN_EMAILS.join(' • ')

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 shadow-gold text-center">
          <Image
            src={logoSrc}
            alt="Taries Beauty"
            width={72}
            height={72}
            unoptimized
            className="rounded-full mx-auto mb-4 border-2 border-brand-gold shadow-gold"
          />
          <p className="text-xs tracking-widest text-brand-gold/60 uppercase mb-2">Restricted Area</p>
          <h1 className="text-2xl font-display font-bold gold-text mb-3">Admin accounts only</h1>
          {user ? (
            <>
              <p className="text-sm text-white/70 mb-2">
                <span className="text-brand-gold">{user.email}</span> is signed in, but it is not on the admin allowlist.
              </p>
              <p className="text-xs text-white/45">Allowed admins: {allowedEmails}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-white/70 mb-2">
                Sign in with one of the approved admin accounts to continue.
              </p>
              <p className="text-xs text-white/45">Allowed admins: {allowedEmails}</p>
            </>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="btn-gold">
              Sign in
            </Link>
            <Link href="/account" className="btn-outline-gold">
              Open account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── DashboardTab ──────────────────────────────────────────────────────────────
function DashboardTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const text = useAdminText()
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [topViews, setTopViews] = useState<{ slug: string; views: number }[]>([])

  useEffect(() => {
    const refresh = () => {
      localStorage.setItem('taries-presence-admin', Date.now().toString())
      setOrders(getAllOrders())
      setUsers(readUsers())
      setVendors(readVendors())
      setTopViews(getAllViewsSorted().slice(0, 5))
    }

    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const totalRevenue  = useMemo(() => orders.reduce((s, o) => s + o.grandTotalUSD, 0), [orders])
  const onlineCount   = useMemo(() => users.filter(u => isOnline(u.id)).length, [users])
  const pendingVendors = useMemo(() => vendors.filter(v => v.status === 'pending').length, [vendors])
  const openSupport = useMemo(() => readSupportThreads(users, orders).filter(thread => thread.status !== 'resolved').length, [orders, users])
  const maxViews = topViews[0]?.views ?? 1

  const activity = useMemo(() => {
    type Item = { icon: string; text: string; date: string }
    const items: Item[] = [
      ...orders.slice(0, 20).map(o => ({ icon: '📦', text: `Order #${o.orderId.slice(-6)} — ${o.customer.firstName} ${o.customer.lastName}`, date: o.date })),
      ...users.slice(0, 20).map(u => ({ icon: '👤', text: `${u.firstName} ${u.lastName} ${text.registered}`, date: u.createdAt })),
      ...vendors.slice(0, 20).map(v => ({ icon: '🏪', text: `${v.businessName} applied as vendor`, date: v.appliedAt })),
    ]
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
  }, [orders, text.registered, users, vendors])

  const kpis = useMemo(() => [
    { label: text.totalRevenue,   value: `$${totalRevenue.toFixed(2)}`, icon: '💰', sub: `${orders.length} ${text.ordersCount}` },
    { label: text.totalOrders,    value: String(orders.length),         icon: '📦', sub: `${orders.filter(o => o.status === 'pending').length} ${text.pendingCount}` },
    { label: text.totalUsers,     value: String(users.length),          icon: '👥', sub: `${onlineCount} ${text.onlineCount}` },
    { label: text.onlineNow,      value: String(onlineCount),           icon: '🟢', sub: text.last15Min },
    { label: text.supportInbox,   value: String(openSupport),           icon: '💬', sub: text.needResponse },
    { label: text.pendingVendors, value: String(pendingVendors),        icon: '🏪', sub: text.awaitingReview },
  ], [totalRevenue, orders, users, onlineCount, openSupport, pendingVendors, text])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-display text-2xl gold-text">{text.dashboard}</h1>
      <div className="rounded-xl border border-brand-gold/20 bg-brand-gold/5 px-4 py-3 text-sm text-brand-cream/70">
        {text.localDataNotice}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4 hover:border-brand-gold/40 transition-all">
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-xl font-bold font-heading text-white">{kpi.value}</div>
            <div className="text-xs text-brand-gold mt-0.5">{kpi.label}</div>
            <div className="text-xs text-white/40">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4">🕐 {text.recentActivity}</h2>
          {activity.length === 0 && <p className="text-white/40 text-sm">{text.noActivityYet}</p>}
          <div className="space-y-1">
            {activity.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/80 truncate">{item.icon} {item.text}</span>
                <span className="text-xs text-white/40 ml-3 shrink-0">{timeAgo(item.date)}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> {text.topProductsByViews}
          </h2>
          {topViews.length === 0 && <p className="text-white/40 text-sm">{text.noViewDataYet}</p>}
          <div className="space-y-3">
            {topViews.map((v, i) => {
              const pct = Math.round((v.views / maxViews) * 100)
              const prod = products.find(p => p.slug === v.slug)
              return (
                <div key={v.slug} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80 truncate">{prod?.name ?? v.slug}</span>
                    <span className="text-brand-gold ml-2 shrink-0">{v.views}</span>
                  </div>
                  <div className="h-1.5 bg-brand-black-3 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1, duration: 0.8 }}
                      className="h-full bg-gold-gradient rounded-full" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4">{text.quickActions}</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => exportBlob(ordersToCSV(orders), 'taries-orders.csv', 'text/csv')}
            className="btn-outline-gold flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> {text.exportCsv}
          </button>
          <button onClick={() => onNavigate('vendors')} className="btn-outline-gold relative flex items-center gap-2 text-sm">
            <Store className="w-4 h-4" /> {text.pendingVendors}
            {pendingVendors > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {pendingVendors}
              </span>
            )}
          </button>
          <button onClick={() => onNavigate('users')} className="btn-outline-gold flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" /> {text.registeredUsers}
          </button>
          <button onClick={() => onNavigate('support')} className="btn-outline-gold flex items-center gap-2 text-sm">
            <MessageCircle className="w-4 h-4" /> {text.supportInbox}
          </button>
          <button onClick={() => onNavigate('marketing')} className="btn-outline-gold flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4" /> {text.broadcastsPromos}
          </button>
          <button onClick={() => onNavigate('products')} className="btn-gold flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {text.manageProducts}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── OrdersTab ─────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [sortField, setSortField] = useState<'date' | 'total' | 'status'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<Order['status']>('processing')
  const [page, setPage] = useState(1)

  useEffect(() => { setOrders(getAllOrders()) }, [])

  const filtered = useMemo(() => {
    let result = [...orders]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        o.orderId.toLowerCase().includes(q) ||
        o.customer.firstName.toLowerCase().includes(q) ||
        o.customer.lastName.toLowerCase().includes(q) ||
        o.customer.email.toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'cancelled') { result = [] }
    else if (statusFilter !== 'all') { result = result.filter(o => o.status === statusFilter) }
    const now = new Date()
    if (dateFilter === 'today') { result = result.filter(o => new Date(o.date).toDateString() === now.toDateString()) }
    else if (dateFilter === 'week') { const ago = new Date(now.getTime() - 7*86400000); result = result.filter(o => new Date(o.date) >= ago) }
    else if (dateFilter === 'month') { const ago = new Date(now.getTime() - 30*86400000); result = result.filter(o => new Date(o.date) >= ago) }
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date')   cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      else if (sortField === 'total')  cmp = a.grandTotalUSD - b.grandTotalUSD
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [orders, search, statusFilter, dateFilter, sortField, sortDir])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleStatusChange(orderId: string, status: Order['status']) {
    updateOrderStatus(orderId, status)
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o))
    toast.success(`Order updated to ${status}`)
  }
  function handleDelete(orderId: string) {
    const updated = orders.filter(o => o.orderId !== orderId)
    setOrders(updated)
    localStorage.setItem('taries-orders', JSON.stringify(updated))
    setSelected(prev => { const s = new Set(prev); s.delete(orderId); return s })
    toast.success('Order deleted')
  }
  function handleBulkApply() {
    const ids = Array.from(selected)
    const updated = orders.map(o => ids.includes(o.orderId) ? { ...o, status: bulkStatus } : o)
    setOrders(updated)
    localStorage.setItem('taries-orders', JSON.stringify(updated))
    toast.success(`${ids.length} orders updated`)
    setSelected(new Set())
  }
  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }
  function toggleSelectAll() {
    if (selected.size === pageOrders.length && pageOrders.length > 0) setSelected(new Set())
    else setSelected(new Set(pageOrders.map(o => o.orderId)))
  }
  function sortBy(field: 'date' | 'total' | 'status') {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }
  const SortChevron = ({ f }: { f: 'date' | 'total' | 'status' }) =>
    sortField === f ? (sortDir === 'asc' ? <ChevronUp className="inline w-3 h-3 ml-0.5" /> : <ChevronDown className="inline w-3 h-3 ml-0.5" />) : null

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-display text-2xl gold-text">Orders</h1>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="text" placeholder="Search orders…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as StatusFilterOption); setPage(1) }}
          className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white focus:outline-none">
          {STATUS_FILTER_OPTIONS.map(s => <option key={s} value={s} className="bg-brand-black">{s === 'all' ? 'All Status' : s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={dateFilter} onChange={e => { setDateFilter(e.target.value as 'all'|'today'|'week'|'month'); setPage(1) }}
          className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white focus:outline-none">
          <option value="all" className="bg-brand-black">All Time</option>
          <option value="today" className="bg-brand-black">Today</option>
          <option value="week" className="bg-brand-black">This Week</option>
          <option value="month" className="bg-brand-black">This Month</option>
        </select>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex flex-wrap items-center gap-3 p-3 bg-brand-gold/10 border border-brand-gold/30 rounded-xl">
            <span className="text-sm text-brand-gold font-semibold">{selected.size} selected</span>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as Order['status'])}
              className="px-2 py-1 bg-brand-black-3 border border-brand-gold/20 rounded text-sm text-white focus:outline-none">
              {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-brand-black">{s}</option>)}
            </select>
            <button onClick={handleBulkApply} className="btn-gold text-xs py-1 px-3">Apply</button>
            <button onClick={() => exportBlob(ordersToCSV(orders.filter(o => selected.has(o.orderId))), 'selected-orders.csv', 'text/csv')}
              className="btn-outline-gold text-xs py-1 px-3 flex items-center gap-1">
              <Download className="w-3 h-3" /> Export
            </button>
            <button onClick={() => setSelected(new Set())} className="ml-auto p-1 text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto rounded-xl border border-brand-gold/20">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-brand-black-3 text-left">
            <tr>
              <th className="p-3 w-10"><input type="checkbox" checked={selected.size === pageOrders.length && pageOrders.length > 0} onChange={toggleSelectAll} className="accent-brand-gold" /></th>
              <th className="p-3 text-brand-gold/70 font-medium">Order ID</th>
              <th className="p-3 text-brand-gold/70 font-medium cursor-pointer select-none" onClick={() => sortBy('date')}>Date <SortChevron f="date" /></th>
              <th className="p-3 text-brand-gold/70 font-medium">Customer</th>
              <th className="p-3 text-brand-gold/70 font-medium text-center">Items</th>
              <th className="p-3 text-brand-gold/70 font-medium cursor-pointer select-none" onClick={() => sortBy('total')}>Total <SortChevron f="total" /></th>
              <th className="p-3 text-brand-gold/70 font-medium cursor-pointer select-none" onClick={() => sortBy('status')}>Status <SortChevron f="status" /></th>
              <th className="p-3 text-brand-gold/70 font-medium">Payment</th>
              <th className="p-3 text-brand-gold/70 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageOrders.length === 0 && (
              <tr><td colSpan={9} className="p-12 text-center text-white/40">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />No orders found
              </td></tr>
            )}
            {pageOrders.map((order, i) => (
              <Fragment key={order.orderId}>
                <motion.tr initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="border-t border-white/5 hover:bg-brand-black-3/50">
                  <td className="p-3"><input type="checkbox" checked={selected.has(order.orderId)} onChange={() => toggleSelect(order.orderId)} className="accent-brand-gold" /></td>
                  <td className="p-3 font-mono text-xs text-brand-gold/80">#{order.orderId.slice(-8)}</td>
                  <td className="p-3 text-white/60 text-xs whitespace-nowrap">{formatOrderDate(order.date)}</td>
                  <td className="p-3">
                    <p className="text-white text-sm">{order.customer.firstName} {order.customer.lastName}</p>
                    <p className="text-xs text-white/40">{order.customer.email}</p>
                  </td>
                  <td className="p-3 text-center text-white/60">{order.items.reduce((s, it) => s + it.quantity, 0)}</td>
                  <td className="p-3 text-white font-semibold">${order.grandTotalUSD.toFixed(2)}</td>
                  <td className="p-3">
                    <select value={order.status} onChange={e => handleStatusChange(order.orderId, e.target.value as Order['status'])}
                      className={`px-2 py-0.5 rounded-full text-xs cursor-pointer bg-transparent ${statusColor[order.status]}`}>
                      {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-brand-black text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setExpandedId(expandedId === order.orderId ? null : order.orderId)}
                        className="p-1.5 text-white/40 hover:text-brand-gold rounded-lg hover:bg-brand-gold/10 transition-all"><Eye className="w-4 h-4" /></button>
                      <a href={`https://wa.me/${order.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        className="p-1.5 text-white/40 hover:text-green-400 rounded-lg hover:bg-green-400/10 transition-all"><Phone className="w-4 h-4" /></a>
                      <button onClick={() => handleDelete(order.orderId)}
                        className="p-1.5 text-white/40 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
                <AnimatePresence>
                  {expandedId === order.orderId && (
                    <motion.tr key={`exp-${order.orderId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td colSpan={9} className="bg-brand-black-3/60 px-6 py-5">
                        <div className="grid md:grid-cols-2 gap-6 mb-4">
                          <div>
                            <h4 className="text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">Shipping</h4>
                            <p className="text-sm text-white/80">{order.shipping.address}</p>
                            <p className="text-sm text-white/60">{order.shipping.city}, {order.shipping.state}</p>
                            <p className="text-sm text-white/60">{order.shipping.country} {order.shipping.postalCode}</p>
                          </div>
                          <div>
                            <h4 className="text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">Cost Breakdown</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between"><span className="text-white/50">Subtotal</span><span>${order.subtotalUSD.toFixed(2)}</span></div>
                              <div className="flex justify-between"><span className="text-white/50">Shipping</span><span>${order.shippingUSD.toFixed(2)}</span></div>
                              <div className="flex justify-between font-semibold border-t border-white/10 pt-1 mt-1">
                                <span className="text-brand-gold">Total</span><span className="text-brand-gold">${order.grandTotalUSD.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <h4 className="text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">Items</h4>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                              <img src={item.product.images[0] ?? ''} alt={item.product.name}
                                className="w-10 h-10 rounded-lg object-cover bg-brand-black-3 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{item.product.name}</p>
                                <p className="text-xs text-white/40">Qty: {item.quantity} × ${item.product.price.toFixed(2)}</p>
                              </div>
                              <span className="text-sm font-semibold text-white shrink-0">${(item.product.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        {order.notes && <p className="mt-3 text-xs text-white/40 italic">Note: {order.notes}</p>}
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">{filtered.length} orders</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg bg-brand-black-3 text-sm text-white disabled:opacity-30">← Prev</button>
            <span className="text-sm text-white/60 px-2">{page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg bg-brand-black-3 text-sm text-white disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── UsersTab ──────────────────────────────────────────────────────────────────
function UsersTab() {
  const text = useAdminText()
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'highspender'>('all')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    const refresh = () => {
      setUsers(readUsers())
      setAllOrders(getAllOrders())
    }

    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const getUserStats = useCallback((email: string) => {
    const uo = allOrders.filter(o => o.customer.email.toLowerCase() === email.toLowerCase())
    return { count: uo.length, spent: uo.reduce((s, o) => s + o.grandTotalUSD, 0) }
  }, [allOrders])

  const stats = useMemo(() => {
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    return {
      total: users.length,
      online: users.filter(u => isOnline(u.id)).length,
      newThisWeek: users.filter(u => u.createdAt > oneWeekAgo).length,
      suspended: users.filter(u => !!u.suspended).length,
    }
  }, [users])

  const filtered = useMemo(() => {
    let result = [...users]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(u => u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (filter === 'active') result = result.filter(u => !u.suspended)
    else if (filter === 'suspended') result = result.filter(u => !!u.suspended)
    else if (filter === 'highspender') result = result.filter(u => getUserStats(u.email).spent > 100)
    return result
  }, [users, search, filter, getUserStats])

  function handleSuspend(userId: string) {
    const updated = users.map(u => u.id === userId ? { ...u, suspended: !u.suspended } : u)
    setUsers(updated); saveAdminUsers(updated)
    const u = updated.find(x => x.id === userId)
    toast.success(u?.suspended ? 'User suspended' : 'User unsuspended')
    if (selectedUser?.id === userId) setSelectedUser(u ?? null)
  }
  function handleDelete(userId: string) {
    const updated = users.filter(u => u.id !== userId)
    setUsers(updated); saveAdminUsers(updated)
    toast.success('User deleted')
    if (selectedUser?.id === userId) setSelectedUser(null)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-display text-2xl gold-text">{text.users}</h1>
      <div className="rounded-xl border border-brand-gold/20 bg-brand-gold/5 px-4 py-3 text-sm text-brand-cream/70">
        {text.usersNotice}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{label:'Total Users',value:stats.total},{label:'Online Now',value:stats.online},{label:'New This Week',value:stats.newThisWeek},{label:'Suspended',value:stats.suspended}].map(s => (
          <div key={s.label} className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-brand-gold/70 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50" />
        </div>
        <div className="flex gap-1">
          {(['all','active','suspended','highspender'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${filter === f ? 'bg-brand-gold text-black' : 'bg-brand-black-3 text-white/60 hover:text-white'}`}>
              {f === 'highspender' ? 'High Spenders' : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-gold/20">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-brand-black-3 text-left">
            <tr>
              <th className="p-3 text-brand-gold/70 font-medium">User</th>
              <th className="p-3 text-brand-gold/70 font-medium">Email</th>
              <th className="p-3 text-brand-gold/70 font-medium">Phone</th>
              <th className="p-3 text-brand-gold/70 font-medium">Registered</th>
              <th className="p-3 text-brand-gold/70 font-medium text-center">Orders</th>
              <th className="p-3 text-brand-gold/70 font-medium text-right">Spent</th>
              <th className="p-3 text-brand-gold/70 font-medium text-center">Status</th>
              <th className="p-3 text-brand-gold/70 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-12 text-center text-white/40">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />No users found
              </td></tr>
            )}
            {filtered.map((user, i) => {
              const s = getUserStats(user.email)
              const online = isOnline(user.id)
              const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
              return (
                <motion.tr key={user.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="border-t border-white/5 hover:bg-brand-black-3/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-xs font-bold">{initials}</div>
                        {online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-brand-black-2" />}
                      </div>
                      <span className="text-white text-sm">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td className="p-3 text-white/60 text-xs">{user.email}</td>
                  <td className="p-3 text-white/60 text-xs">{user.phone}</td>
                  <td className="p-3 text-white/40 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-center text-white/60">{s.count}</td>
                  <td className="p-3 text-right text-white">${s.spent.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${user.suspended ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {user.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedUser(user)} className="p-1.5 text-white/40 hover:text-brand-gold rounded-lg hover:bg-brand-gold/10 transition-all"><Eye className="w-4 h-4" /></button>
                      <a href={`https://wa.me/${user.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-1.5 text-white/40 hover:text-green-400 rounded-lg hover:bg-green-400/10 transition-all"><Phone className="w-4 h-4" /></a>
                      <button onClick={() => handleSuspend(user.id)} className={`p-1.5 rounded-lg transition-all ${user.suspended ? 'text-green-400 hover:bg-green-400/10' : 'text-white/40 hover:text-yellow-400 hover:bg-yellow-400/10'}`}>
                        {user.suspended ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 text-white/40 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedUser(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-brand-black-2 border-l border-brand-gold/20 z-50 overflow-y-auto">
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-xl text-white">User Profile</h2>
                  <button onClick={() => setSelectedUser(null)} className="p-2 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-xl font-bold">
                      {`${selectedUser.firstName[0] ?? ''}${selectedUser.lastName[0] ?? ''}`.toUpperCase()}
                    </div>
                    {isOnline(selectedUser.id) && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-brand-black-2" />}
                  </div>
                  <div>
                    <h3 className="font-heading text-white text-lg">{selectedUser.firstName} {selectedUser.lastName}</h3>
                    <p className="text-sm text-white/60">{selectedUser.email}</p>
                    <p className="text-xs text-brand-gold/60">{isOnline(selectedUser.id) ? '🟢 Online' : '⚫ Offline'}</p>
                  </div>
                </div>
                {(() => {
                  const s = getUserStats(selectedUser.email)
                  const avg = s.count > 0 ? s.spent / s.count : 0
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {[{label:'Orders',value:s.count},{label:'Spent',value:`$${s.spent.toFixed(0)}`},{label:'Avg',value:`$${avg.toFixed(0)}`}].map(x => (
                        <div key={x.label} className="bg-brand-black-3 rounded-xl p-3 text-center">
                          <p className="font-bold text-white">{x.value}</p>
                          <p className="text-xs text-white/50">{x.label}</p>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                {selectedUser.addresses.length > 0 && (
                  <div>
                    <h4 className="text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">Address Book</h4>
                    <div className="space-y-2">
                      {selectedUser.addresses.map(addr => (
                        <div key={addr.id} className="bg-brand-black-3 rounded-lg p-3 text-sm">
                          <p className="font-semibold text-white">{addr.label}{addr.isDefault && <span className="ml-1 text-xs text-brand-gold">(default)</span>}</p>
                          <p className="text-white/60">{addr.address}, {addr.city}, {addr.country}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(() => {
                  const recent = allOrders.filter(o => o.customer.email.toLowerCase() === selectedUser.email.toLowerCase()).slice(0, 5)
                  if (!recent.length) return null
                  return (
                    <div>
                      <h4 className="text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">Recent Orders</h4>
                      <div className="space-y-2">
                        {recent.map(o => (
                          <div key={o.orderId} className="bg-brand-black-3 rounded-lg p-3 text-sm flex justify-between items-center">
                            <div>
                              <p className="text-white font-mono text-xs">#{o.orderId.slice(-8)}</p>
                              <p className="text-white/40 text-xs">{formatOrderDate(o.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-brand-gold">${o.grandTotalUSD.toFixed(2)}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor[o.status]}`}>{o.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                <div className="border border-red-500/20 rounded-xl p-4 space-y-3">
                  <h4 className="text-red-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Danger Zone
                  </h4>
                  <button onClick={() => handleSuspend(selectedUser.id)}
                    className="w-full py-2 rounded-lg text-sm border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-all">
                    {selectedUser.suspended ? 'Unsuspend User' : 'Suspend User'}
                  </button>
                  <button onClick={() => handleDelete(selectedUser.id)}
                    className="w-full py-2 rounded-lg text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                    Delete User
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── ProductsManagementTab ─────────────────────────────────────────────────────
function ProductsManagementTab() {
  const [subTab, setSubTab] = useState<'catalogue' | 'vendor'>('catalogue')
  const [inventory, setInventoryState] = useState<Record<string, InventoryItem>>({})
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({})
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ProductOverride>({})
  const [vendorProds, setVendorProds] = useState<VendorProduct[]>([])
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({})

  useEffect(() => {
    setInventoryState(getInventory())
    try { const r = localStorage.getItem('taries-product-overrides'); if (r) setOverrides(JSON.parse(r) as Record<string, ProductOverride>) } catch { /* ignore */ }
    setVendorProds(getVendorProducts())
    const vm: Record<string, number> = {}
    getAllViewsSorted().forEach(v => { vm[v.slug] = v.views })
    setViewsMap(vm)
  }, [])

  const filteredProducts = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }, [search])

  function handleStockToggle(slug: string) {
    const cur = inventory[slug] ?? { inStock: true, notes: '' }
    const updated: InventoryItem = { ...cur, inStock: !cur.inStock }
    setInventoryItem(slug, updated)
    setInventoryState(prev => ({ ...prev, [slug]: updated }))
    toast.success(`Stock ${updated.inStock ? 'enabled' : 'disabled'}`)
  }
  function startEdit(p: Product) {
    const ov = overrides[p.slug] ?? {}
    setEditingId(p.slug)
    setEditForm({ name: ov.name ?? p.name, shortDesc: ov.shortDesc ?? p.shortDesc, price: ov.price ?? p.price, originalPrice: ov.originalPrice ?? p.originalPrice, badge: ov.badge ?? p.badge })
  }
  function saveEdit(slug: string) {
    const updated = { ...overrides, [slug]: editForm }
    setOverrides(updated)
    localStorage.setItem('taries-product-overrides', JSON.stringify(updated))
    setEditingId(null)
    toast.success('Product updated')
  }
  function handleVendorAction(vendorId: string, productId: string, status: VendorProduct['status']) {
    saveVendorProductStatus(vendorId, productId, status)
    setVendorProds(prev => prev.map(p => (p.id === productId && p.vendorId === vendorId) ? { ...p, status } : p))
    toast.success(`Product ${status}`)
  }

  const catColors: Record<string, string> = {
    wigs: 'bg-purple-500/20 text-purple-400', bundles: 'bg-blue-500/20 text-blue-400',
    'custom-wigs': 'bg-pink-500/20 text-pink-400', maintenance: 'bg-yellow-500/20 text-yellow-400',
    beauty: 'bg-red-500/20 text-red-400', coats: 'bg-green-500/20 text-green-400',
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl gold-text">Products</h1>
        <div className="flex gap-2">
          {(['catalogue','vendor'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${subTab === t ? 'bg-brand-gold text-black font-semibold' : 'bg-brand-black-3 text-white/60 hover:text-white'}`}>
              {t === 'catalogue' ? '📦 Catalogue' : '🏪 Vendor'}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'catalogue' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-brand-gold/20">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="bg-brand-black-3 text-left">
                <tr>
                  <th className="p-3 text-brand-gold/70 font-medium">Product</th>
                  <th className="p-3 text-brand-gold/70 font-medium">Category</th>
                  <th className="p-3 text-brand-gold/70 font-medium">Price</th>
                  <th className="p-3 text-brand-gold/70 font-medium text-center">Stock</th>
                  <th className="p-3 text-brand-gold/70 font-medium text-center">Views</th>
                  <th className="p-3 text-brand-gold/70 font-medium text-center">Badge</th>
                  <th className="p-3 text-brand-gold/70 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((prod, i) => {
                  const inv = inventory[prod.slug]
                  const inStock = inv !== undefined ? inv.inStock : prod.inStock
                  const ov = overrides[prod.slug] ?? {}
                  const displayPrice = ov.price ?? prod.price
                  const badge = ov.badge ?? prod.badge
                  return (
                    <Fragment key={prod.slug}>
                      <motion.tr initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className="border-t border-white/5 hover:bg-brand-black-3/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <img src={prod.images[0]} alt={prod.name} className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <p className="text-white text-sm">{ov.name ?? prod.name}</p>
                              <p className="text-xs text-white/40">{prod.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${catColors[prod.category] ?? 'bg-white/10 text-white/60'}`}>{prod.categoryLabel}</span></td>
                        <td className="p-3 text-white">${displayPrice.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleStockToggle(prod.slug)}
                            className={`relative w-10 h-6 rounded-full transition-all ${inStock ? 'bg-green-500' : 'bg-red-500/50'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${inStock ? 'left-5' : 'left-1'}`} />
                          </button>
                        </td>
                        <td className="p-3 text-center text-white/60">{viewsMap[prod.slug] ?? 0}</td>
                        <td className="p-3 text-center">
                          {badge ? <span className="px-2 py-0.5 rounded-full text-xs bg-brand-gold/20 text-brand-gold">{badge}</span> : <span className="text-white/20">—</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => editingId === prod.slug ? setEditingId(null) : startEdit(prod)}
                              className="p-1.5 text-white/40 hover:text-brand-gold rounded-lg hover:bg-brand-gold/10 transition-all"><Pencil className="w-4 h-4" /></button>
                            <a href={`/product/${prod.slug}`} target="_blank" rel="noreferrer"
                              className="p-1.5 text-white/40 hover:text-blue-400 rounded-lg hover:bg-blue-400/10 transition-all"><ExternalLink className="w-4 h-4" /></a>
                          </div>
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {editingId === prod.slug && (
                          <motion.tr key={`edit-${prod.slug}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <td colSpan={7} className="bg-brand-black-3/60 p-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs text-brand-gold/70 mb-1 block">Name</label>
                                  <input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-brand-black border border-brand-gold/20 rounded-lg text-sm text-white focus:outline-none" />
                                </div>
                                <div>
                                  <label className="text-xs text-brand-gold/70 mb-1 block">Price ($)</label>
                                  <input type="number" value={editForm.price ?? ''} onChange={e => setEditForm(f => ({ ...f, price: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 bg-brand-black border border-brand-gold/20 rounded-lg text-sm text-white focus:outline-none" />
                                </div>
                                <div>
                                  <label className="text-xs text-brand-gold/70 mb-1 block">Original Price ($)</label>
                                  <input type="number" value={editForm.originalPrice ?? ''} onChange={e => setEditForm(f => ({ ...f, originalPrice: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 bg-brand-black border border-brand-gold/20 rounded-lg text-sm text-white focus:outline-none" />
                                </div>
                                <div>
                                  <label className="text-xs text-brand-gold/70 mb-1 block">Badge</label>
                                  <select value={editForm.badge ?? ''} onChange={e => {
                                    const v = e.target.value
                                    setEditForm(f => ({ ...f, badge: (v==='new'||v==='sale'||v==='hot'||v==='bestseller') ? (v as NonNullable<ProductOverride['badge']>) : undefined }))
                                  }} className="w-full px-3 py-2 bg-brand-black border border-brand-gold/20 rounded-lg text-sm text-white focus:outline-none">
                                    <option value="">None</option>
                                    <option value="new">New</option>
                                    <option value="sale">Sale</option>
                                    <option value="hot">Hot</option>
                                    <option value="bestseller">Bestseller</option>
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs text-brand-gold/70 mb-1 block">Short Description</label>
                                  <input value={editForm.shortDesc ?? ''} onChange={e => setEditForm(f => ({ ...f, shortDesc: e.target.value }))}
                                    className="w-full px-3 py-2 bg-brand-black border border-brand-gold/20 rounded-lg text-sm text-white focus:outline-none" />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => saveEdit(prod.slug)} className="btn-gold py-1.5 px-4 text-sm flex items-center gap-1"><Check className="w-3 h-3" /> Save</button>
                                <button onClick={() => setEditingId(null)} className="btn-outline-gold py-1.5 px-4 text-sm">Cancel</button>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'vendor' && (
        <div className="overflow-x-auto rounded-xl border border-brand-gold/20">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-brand-black-3 text-left">
              <tr>
                <th className="p-3 text-brand-gold/70 font-medium">Product</th>
                <th className="p-3 text-brand-gold/70 font-medium">Vendor</th>
                <th className="p-3 text-brand-gold/70 font-medium">Category</th>
                <th className="p-3 text-brand-gold/70 font-medium">Price</th>
                <th className="p-3 text-brand-gold/70 font-medium">Status</th>
                <th className="p-3 text-brand-gold/70 font-medium">Date</th>
                <th className="p-3 text-brand-gold/70 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendorProds.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-white/40">No vendor products yet</td></tr>}
              {vendorProds.map((vp, i) => (
                <motion.tr key={`${vp.vendorId}-${vp.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="border-t border-white/5 hover:bg-brand-black-3/50">
                  <td className="p-3 text-white">{vp.name}</td>
                  <td className="p-3 text-white/60">{vp.vendorName ?? vp.vendorId}</td>
                  <td className="p-3 text-white/60">{vp.category}</td>
                  <td className="p-3 text-white">${vp.price.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${vp.status==='approved'?'bg-green-500/20 text-green-400':vp.status==='featured'?'bg-brand-gold/20 text-brand-gold':vp.status==='removed'?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-400'}`}>{vp.status}</span>
                  </td>
                  <td className="p-3 text-white/40 text-xs">{new Date(vp.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleVendorAction(vp.vendorId, vp.id, 'approved')} className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-all">Approve</button>
                      <button onClick={() => handleVendorAction(vp.vendorId, vp.id, 'featured')} className="px-2 py-1 text-xs rounded bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/40 transition-all">Feature</button>
                      <button onClick={() => handleVendorAction(vp.vendorId, vp.id, 'removed')} className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all">Remove</button>
                    </div>
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

// ── VendorsTab ────────────────────────────────────────────────────────────────
function VendorsTab() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Vendor['status']>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { setVendors(readVendors()) }, [])

  const filtered = useMemo(() => {
    let result = [...vendors]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(v => v.businessName.toLowerCase().includes(q) || v.ownerName.toLowerCase().includes(q) || v.email.toLowerCase().includes(q))
    }
    if (filter !== 'all') result = result.filter(v => v.status === filter)
    return result
  }, [vendors, search, filter])

  const vstats = useMemo(() => ({
    total: vendors.length, approved: vendors.filter(v=>v.status==='approved').length,
    pending: vendors.filter(v=>v.status==='pending').length, rejected: vendors.filter(v=>v.status==='rejected').length,
  }), [vendors])

  function updateStatus(id: string, status: Vendor['status']) {
    const updated = vendors.map(v => v.id === id ? { ...v, status } : v)
    setVendors(updated); saveVendors(updated)
    toast.success(`Vendor ${status}`)
  }

  const vColor: Record<Vendor['status'], string> = {
    pending:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-display text-2xl gold-text">Vendors</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{label:'Total',value:vstats.total},{label:'Approved',value:vstats.approved},{label:'Pending',value:vstats.pending},{label:'Rejected',value:vstats.rejected}].map(s => (
          <div key={s.label} className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-brand-gold/70 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="text" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50" />
        </div>
        <div className="flex gap-1">
          {(['all','pending','approved','rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${filter===f?'bg-brand-gold text-black':'bg-brand-black-3 text-white/60 hover:text-white'}`}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-white/40"><Store className="w-10 h-10 mx-auto mb-2 opacity-30" />No vendors found</div>}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(vendor => (
          <motion.div key={vendor.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-brand-black-2 border border-brand-gold/20 rounded-xl overflow-hidden hover:border-brand-gold/40 transition-all">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div><h3 className="font-heading text-white text-base">{vendor.businessName}</h3><p className="text-sm text-white/60">{vendor.ownerName}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${vColor[vendor.status]}`}>{vendor.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-white/50 mb-4">
                <span>📧 {vendor.email}</span><span>📞 {vendor.phone}</span>
                <span>🏷️ {vendor.category}</span><span>📅 {new Date(vendor.appliedAt).toLocaleDateString()}</span>
                <span className={`col-span-2 ${vendor.feeStatus==='paid'?'text-green-400':'text-yellow-400'}`}>💳 Fee: {vendor.feeStatus}</span>
              </div>
              <div className="flex gap-2">
                {vendor.status !== 'approved' && <button onClick={() => updateStatus(vendor.id,'approved')} className="flex-1 py-2 rounded-lg text-sm bg-green-500/20 text-green-400 hover:bg-green-500/40 transition-all">Approve</button>}
                {vendor.status !== 'rejected' && <button onClick={() => updateStatus(vendor.id,'rejected')} className="flex-1 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all">Reject</button>}
                <button onClick={() => setExpandedId(expandedId===vendor.id?null:vendor.id)} className="px-3 py-2 rounded-lg text-sm bg-brand-black-3 text-white/60 hover:text-white transition-all">
                  {expandedId===vendor.id?'▲':'▼'}
                </button>
              </div>
              <AnimatePresence>
                {expandedId === vendor.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-white/10 overflow-hidden">
                    <p className="text-sm text-white/60">{vendor.description || 'No description provided'}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── AnalyticsTab ──────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [topViews, setTopViews] = useState<{ slug: string; views: number }[]>([])

  useEffect(() => { setOrders(getAllOrders()); setTopViews(getAllViewsSorted()) }, [])

  const kpis = useMemo(() => {
    const revenue = orders.reduce((s,o) => s+o.grandTotalUSD, 0)
    const count = orders.length
    return [
      { label: 'Revenue',          value: `$${revenue.toFixed(2)}`,                        icon: '💰' },
      { label: 'Orders',           value: String(count),                                    icon: '📦' },
      { label: 'Avg Order Value',  value: `$${(count>0?revenue/count:0).toFixed(2)}`,       icon: '📊' },
      { label: 'Unique Customers', value: String(new Set(orders.map(o=>o.customer.email)).size), icon: '👥' },
      { label: 'Total Views',      value: String(topViews.reduce((s,v)=>s+v.views,0)),      icon: '👁️' },
      { label: 'Products Listed',  value: String(products.length),                          icon: '🏷️' },
    ]
  }, [orders, topViews])

  const weeklyRevenue = useMemo(() => {
    const days: { day: string; amount: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0)
      const end = new Date(d); end.setHours(23,59,59,999)
      days.push({ day: d.toLocaleDateString('en-US',{weekday:'short'}), amount: orders.filter(o=>{const od=new Date(o.date);return od>=d&&od<=end}).reduce((s,o)=>s+o.grandTotalUSD,0) })
    }
    return days
  }, [orders])
  const maxWeekly = Math.max(...weeklyRevenue.map(d=>d.amount), 1)

  const topProducts = useMemo(() => {
    const map = new Map<string,{name:string;orders:number;revenue:number;views:number}>()
    for (const order of orders) {
      for (const item of order.items) {
        const slug = item.product.slug
        const ex = map.get(slug) ?? {name:item.product.name,orders:0,revenue:0,views:0}
        map.set(slug, {...ex, orders:ex.orders+item.quantity, revenue:ex.revenue+item.product.price*item.quantity})
      }
    }
    topViews.forEach(v => { const ex=map.get(v.slug); if(ex) map.set(v.slug,{...ex,views:v.views}) })
    return Array.from(map.values()).sort((a,b)=>b.revenue-a.revenue).slice(0,10)
  }, [orders, topViews])

  const geography = useMemo(() => {
    const cm = new Map<string,number>()
    orders.forEach(o => { cm.set(o.shipping.country,(cm.get(o.shipping.country)??0)+1) })
    return Array.from(cm.entries()).sort((a,b)=>b[1]-a[1])
      .map(([country,count]) => ({country,count,pct:orders.length>0?Math.round(count/orders.length*100):0}))
  }, [orders])

  const discountCodes = useMemo(() => {
    const cm = new Map<string,number>()
    orders.forEach(o => {
      if (o.couponCode) {
        const code = o.couponCode.toUpperCase()
        cm.set(code, (cm.get(code) ?? 0) + 1)
        return
      }
      if (!o.notes) return
      const match = o.notes.match(/coupon[:\s]+(\w+)/i)
      if (match) { const code=match[1].toUpperCase(); cm.set(code,(cm.get(code)??0)+1) }
    })
    return Array.from(cm.entries()).sort((a,b)=>b[1]-a[1])
  }, [orders])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-display text-2xl gold-text">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4">
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-xl font-bold font-heading text-white">{kpi.value}</div>
            <div className="text-xs text-brand-gold mt-0.5">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4">📈 Weekly Revenue</h2>
          <div className="space-y-3">
            {weeklyRevenue.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-white/50 w-8 shrink-0">{d.day}</span>
                <div className="flex-1 h-6 bg-brand-black-3 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(d.amount/maxWeekly)*100}%` }}
                    transition={{ delay: i*0.08, duration: 0.7 }} className="h-full bg-gold-gradient rounded-full" />
                </div>
                <span className="text-white w-16 text-right shrink-0">${d.amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">🌍 Geography</h2>
          {geography.length===0 && <p className="text-white/40 text-sm">No data yet</p>}
          <div className="flex flex-wrap gap-2">
            {geography.map(g => (
              <span key={g.country} className="px-3 py-1 rounded-full text-xs bg-brand-black-3 text-white/80 border border-brand-gold/20">
                {g.country} <span className="text-brand-gold ml-1">{g.pct}%</span>
              </span>
            ))}
          </div>
          {discountCodes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold/70 mb-2">Discount Codes</h3>
              <div className="flex flex-wrap gap-2">
                {discountCodes.map(([code,count]) => (
                  <span key={code} className="px-2 py-0.5 rounded-full text-xs bg-brand-gold/20 text-brand-gold">{code} ×{count}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-4">🏆 Top Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead><tr className="text-brand-gold/70 text-left border-b border-white/10">
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium text-center">Views</th>
              <th className="pb-2 font-medium text-center">Units Sold</th>
              <th className="pb-2 font-medium text-right">Revenue</th>
              <th className="pb-2 font-medium text-right">Conversion</th>
            </tr></thead>
            <tbody>
              {topProducts.length===0 && <tr><td colSpan={5} className="py-8 text-center text-white/40">No order data yet</td></tr>}
              {topProducts.map((p, i) => (
                <motion.tr key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.03 }}
                  className="border-b border-white/5 last:border-0">
                  <td className="py-3 text-white">{p.name}</td>
                  <td className="py-3 text-center text-white/60">{p.views}</td>
                  <td className="py-3 text-center text-white/60">{p.orders}</td>
                  <td className="py-3 text-right text-brand-gold font-semibold">${p.revenue.toFixed(2)}</td>
                  <td className="py-3 text-right text-white/60">{p.views>0?`${(p.orders/p.views*100).toFixed(1)}%`:'—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── InventoryTab ──────────────────────────────────────────────────────────────
function InventoryTab() {
  const [inventory, setInventoryState] = useState<Record<string, InventoryItem>>({})
  const [search, setSearch] = useState('')
  const [editingNotes, setEditingNotes] = useState<{ slug: string; value: string } | null>(null)

  useEffect(() => { setInventoryState(getInventory()) }, [])

  const filtered = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
  }, [search])

  function handleStockToggle(slug: string) {
    const cur = inventory[slug] ?? { inStock: true, notes: '' }
    const updated: InventoryItem = { ...cur, inStock: !cur.inStock }
    setInventoryItem(slug, updated)
    setInventoryState(prev => ({ ...prev, [slug]: updated }))
    toast.success(`Stock ${updated.inStock ? 'enabled' : 'disabled'}`)
  }
  function saveNotes(slug: string) {
    if (!editingNotes) return
    const cur = inventory[slug] ?? { inStock: true, notes: '' }
    const updated: InventoryItem = { ...cur, notes: editingNotes.value }
    setInventoryItem(slug, updated)
    setInventoryState(prev => ({ ...prev, [slug]: updated }))
    setEditingNotes(null)
    toast.success('Notes saved')
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="font-display text-2xl gold-text">Inventory</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-brand-gold/20">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-brand-black-3 text-left">
            <tr>
              <th className="p-3 text-brand-gold/70 font-medium">Product</th>
              <th className="p-3 text-brand-gold/70 font-medium">Category</th>
              <th className="p-3 text-brand-gold/70 font-medium">Price</th>
              <th className="p-3 text-brand-gold/70 font-medium">SKU</th>
              <th className="p-3 text-brand-gold/70 font-medium text-center">In Stock</th>
              <th className="p-3 text-brand-gold/70 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((prod, i) => {
              const inv = inventory[prod.slug] ?? { inStock: prod.inStock, notes: '' }
              const isEditing = editingNotes?.slug === prod.slug
              return (
                <motion.tr key={prod.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="border-t border-white/5 hover:bg-brand-black-3/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img src={prod.images[0]} alt={prod.name} className="w-8 h-8 rounded-lg object-cover" />
                      <span className="text-white text-sm">{prod.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-white/60">{prod.categoryLabel}</td>
                  <td className="p-3 text-white">${prod.price.toFixed(2)}</td>
                  <td className="p-3 font-mono text-xs text-white/40">{prod.id}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleStockToggle(prod.slug)}
                      className={`relative w-10 h-6 rounded-full transition-all ${inv.inStock ? 'bg-green-500' : 'bg-red-500/50'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${inv.inStock ? 'left-5' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input value={editingNotes.value} onChange={e => setEditingNotes({ slug: prod.slug, value: e.target.value })} autoFocus
                          className="flex-1 px-2 py-1 bg-brand-black border border-brand-gold/30 rounded text-sm text-white focus:outline-none" />
                        <button onClick={() => saveNotes(prod.slug)} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingNotes(null)} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingNotes({ slug: prod.slug, value: inv.notes })}
                        className="text-left text-sm text-white/40 hover:text-white/80 w-full truncate transition-colors">
                        {inv.notes || <span className="italic opacity-50">Add notes…</span>}
                      </button>
                    )}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── SettingsTab ───────────────────────────────────────────────────────────────
function SettingsTab() {
  const [pinForm, setPinForm] = useState({ current: '', next: '', confirm: '' })
  const [pinError, setPinError] = useState('')
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)
  const [maintenance, setMaintenance] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(getStoreSettings())
    setMaintenance(getMaintenanceMode())
  }, [])

  function handlePinChange() {
    if (pinForm.current !== getAdminPin()) { setPinError('Current PIN is incorrect'); return }
    if (!/^\d{6}$/.test(pinForm.next)) { setPinError('New PIN must be 6 digits'); return }
    if (pinForm.next !== pinForm.confirm) { setPinError('PINs do not match'); return }
    localStorage.setItem('taries-admin-pin', pinForm.next)
    setPinForm({ current: '', next: '', confirm: '' }); setPinError('')
    toast.success('PIN changed successfully')
  }
  function handleSaveSettings() {
    saveStoreSettings(settings)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    toast.success('Settings saved')
  }
  function handleMaintenanceToggle() {
    const next = !maintenance; setMaintenance(next)
    saveMaintenanceMode(next)
    toast.success(`Maintenance mode ${next ? 'enabled' : 'disabled'}`)
  }
  function handleExportAll() {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('taries-')) continue
      const val = localStorage.getItem(key); if (!val) continue
      try { data[key] = JSON.parse(val) } catch { data[key] = val }
    }
    exportBlob(JSON.stringify(data, null, 2), 'taries-backup.json', 'application/json')
    toast.success('Data exported')
  }
  function handleClearTestData() {
    if (!window.confirm('Clear all test data? This cannot be undone.')) return
    if (!window.confirm('Are you absolutely sure? This will delete all orders and sessions.')) return
    const toClear = ['taries-orders','taries-cart','taries-last-order-id']
    const sessionKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('taries-session')) sessionKeys.push(k) }
    ;[...toClear, ...sessionKeys].forEach(k => localStorage.removeItem(k))
    toast.success('Test data cleared')
  }

  const ic = "w-full px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50"

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="font-display text-2xl gold-text">Settings</h1>

      <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 space-y-4">
        <h2 className="font-heading text-white flex items-center gap-2"><Lock className="w-4 h-4 text-brand-gold" /> Change PIN</h2>
        <div className="grid grid-cols-3 gap-3">
          {([['current','Current PIN'],['next','New 6-digit PIN'],['confirm','Confirm PIN']] as const).map(([field, label]) => (
            <div key={field}>
              <label className="text-xs text-brand-gold/70 mb-1 block">{label}</label>
              <input type="password" maxLength={6} value={pinForm[field]} onChange={e => setPinForm(f => ({...f, [field]: e.target.value.replace(/\D/g, '').slice(0, 6) }))} className={ic} placeholder="••••••" />
            </div>
          ))}
        </div>
        {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
        <button onClick={handlePinChange} className="btn-gold text-sm">Update PIN</button>
      </div>

      <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 space-y-4">
        <h2 className="font-heading text-white flex items-center gap-2"><Settings className="w-4 h-4 text-brand-gold" /> Store Info</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-brand-gold/70 mb-1 block">Store Name</label><input value={settings.storeName} onChange={e => setSettings(s=>({...s,storeName:e.target.value}))} className={ic} /></div>
          <div><label className="text-xs text-brand-gold/70 mb-1 block">WhatsApp</label><input value={settings.whatsapp} onChange={e => setSettings(s=>({...s,whatsapp:e.target.value}))} className={ic} placeholder="+234..." /></div>
          <div><label className="text-xs text-brand-gold/70 mb-1 block">Email</label><input value={settings.email} onChange={e => setSettings(s=>({...s,email:e.target.value}))} className={ic} /></div>
          <div><label className="text-xs text-brand-gold/70 mb-1 block">Announcement</label><input value={settings.announcement} onChange={e => setSettings(s=>({...s,announcement:e.target.value}))} className={ic} /></div>
        </div>
        <button onClick={handleSaveSettings} className={`btn-gold text-sm flex items-center gap-2 ${saved?'opacity-70':''}`}>
          {saved?<><Check className="w-4 h-4"/>Saved!</>:'Save Settings'}
        </button>
      </div>

      <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
        <h2 className="font-heading text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-brand-gold" /> Maintenance Mode</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">Show maintenance page to all visitors</p>
          <button onClick={handleMaintenanceToggle}
            className={`relative w-12 h-7 rounded-full transition-all ${maintenance?'bg-brand-gold':'bg-brand-black-3 border border-brand-gold/30'}`}>
            <div className={`absolute top-1.5 w-4 h-4 rounded-full bg-white transition-all ${maintenance?'left-7':'left-1.5'}`} />
          </button>
        </div>
      </div>

      <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 space-y-3">
        <h2 className="font-heading text-white flex items-center gap-2"><Download className="w-4 h-4 text-brand-gold" /> Data Management</h2>
        <button onClick={handleExportAll} className="btn-outline-gold text-sm flex items-center gap-2 w-full justify-center">
          <Download className="w-4 h-4" /> Export All Store Data
        </button>
      </div>

      <div className="bg-brand-black-2 border border-red-500/20 rounded-xl p-5 space-y-3">
        <h2 className="font-heading text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Danger Zone</h2>
        <p className="text-sm text-white/50">Clears all test orders, sessions and cart data.</p>
        <button onClick={handleClearTestData} className="w-full py-2 rounded-lg text-sm border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all">Clear Test Data</button>
      </div>
    </div>
  )
}

// ── AdminPage ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const text = useAdminText()
  const [authenticated, setAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [orderBadge, setOrderBadge] = useState(0)
  const [vendorBadge, setVendorBadge] = useState(0)
  const [adminUser, setAdminUser] = useState<User | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setAdminUser(getCurrentUser())
      setAccessChecked(true)
    }

    refresh()
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  useEffect(() => {
    if (!authenticated || !isAdminUser(adminUser)) return
    setOrderBadge(getAllOrders().filter(o => o.status === 'pending').length)
    setVendorBadge(readVendors().filter(v => v.status === 'pending').length)
  }, [adminUser, authenticated])

  if (!accessChecked) return null
  if (!isAdminUser(adminUser)) return <AdminAccountGate user={adminUser} />
  if (!authenticated) return <PinEntry onSuccess={() => setAuthenticated(true)} />

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard',  label: text.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'orders',     label: text.orders,    icon: <Package className="w-4 h-4" />,  badge: orderBadge  },
    { id: 'users',      label: text.users,     icon: <Users className="w-4 h-4" /> },
    { id: 'products',   label: text.products,  icon: <Tag className="w-4 h-4" /> },
    { id: 'vendors',    label: text.vendors,   icon: <Store className="w-4 h-4" />,    badge: vendorBadge },
    { id: 'analytics',  label: text.analytics, icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'inventory',  label: text.inventory, icon: <Boxes className="w-4 h-4" /> },
    { id: 'support',    label: text.support,   icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'marketing',  label: text.marketing, icon: <ExternalLink className="w-4 h-4" /> },
    { id: 'audit',      label: text.audit,     icon: <Eye className="w-4 h-4" /> },
    { id: 'settings',   label: text.settings,  icon: <Settings className="w-4 h-4" /> },
  ]

  function renderTab() {
    switch (activeTab) {
      case 'dashboard':  return <DashboardTab onNavigate={setActiveTab} />
      case 'orders':     return <OrdersTab />
      case 'users':      return <UsersTab />
      case 'products':   return <ProductsManagementTab />
      case 'vendors':    return <VendorsTab />
      case 'analytics':  return <AnalyticsTab />
      case 'inventory':  return <InventoryTab />
      case 'support':    return <SupportInboxTab adminEmail={adminUser?.email ?? 'unknown-admin'} />
      case 'marketing':  return <MarketingTab adminEmail={adminUser?.email ?? 'unknown-admin'} />
      case 'audit':      return <AuditLogTab />
      case 'settings':   return <SettingsTab />
    }
  }

  return (
    <div className="min-h-screen bg-brand-black text-white font-body">
      <Toaster position="top-right" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid rgba(201,150,12,0.3)' } }} />

      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-brand-black-2 border-r border-brand-gold/20 z-40">
        <div className="p-5 border-b border-brand-gold/20">
          <div className="flex items-center gap-3">
            <Image src={logoSrc} alt="Taries" width={36} height={36} unoptimized className="rounded-full border border-brand-gold/40" />
            <div><p className="font-heading text-white text-sm font-bold">Admin Panel</p><p className="text-xs text-brand-gold/60">Taries Beauty</p></div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-all relative ${activeTab===tab.id?'border-l-2 border-brand-gold text-brand-gold bg-brand-gold/5':'border-l-2 border-transparent text-white/60 hover:text-white hover:bg-white/5'}`}>
              {tab.icon}<span>{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-gold/20">
          <button onClick={() => setAuthenticated(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-40 bg-brand-black-2 border-b border-brand-gold/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src={logoSrc} alt="Taries" width={28} height={28} unoptimized className="rounded-full border border-brand-gold/40" />
            <span className="font-heading text-sm text-brand-gold font-bold">🔐 {text.adminShort}</span>
          </div>
          <button aria-label={text.logout} onClick={() => setAuthenticated(false)} className="p-2 text-white/50 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>
        <div className="flex overflow-x-auto pb-2 px-3 gap-2" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${activeTab===tab.id?'bg-brand-gold text-black font-semibold':'bg-brand-black-3 text-white/60 hover:text-white'}`}>
              {tab.icon}{tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="lg:ml-64 min-h-screen">
        <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-brand-gold/10 bg-brand-black-2/50 backdrop-blur-sm sticky top-0 z-30">
          <p className="font-heading text-sm text-white/50">🔐 {text.adminPanel} — <span className="text-brand-gold">Taries Beauty Emporium</span></p>
          <button onClick={() => setAuthenticated(false)} className="flex items-center gap-2 text-sm text-white/40 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" /> {text.logout}
          </button>
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
