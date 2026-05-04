'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, MessageCircle, Send, AlertTriangle, Eye } from 'lucide-react'
import { categories, type Category } from '@/lib/products'
import { getAllOrders, type Order } from '@/lib/orders'
import type { User } from '@/lib/auth'
import { getAdminCouponList } from '@/lib/coupons'
import { getManagedPromos, removeManagedPromo, saveManagedPromos, type ManagedPromo, upsertManagedPromo } from '@/lib/adminPromos'
import {
  appendAuditEvent,
  appendSupportReply,
  readAuditEvents,
  readBroadcasts,
  readSupportThreads,
  saveBroadcasts,
  updateSupportThreadMeta,
  type AdminBroadcast,
  type AuditEvent,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/adminConsole'
import { getStoreSettings, saveStoreSettings } from '@/lib/storeSettings'

function exportBlob(data: string, filename: string, type: string): void {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function readUsers(): User[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('taries-users')
    return raw ? JSON.parse(raw) as User[] : []
  } catch {
    return []
  }
}

export function SupportInboxTab({ adminEmail }: { adminEmail: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    setUsers(readUsers())
    setOrders(getAllOrders())
  }, [refreshToken])

  const threads = useMemo(() => readSupportThreads(users, orders), [orders, users, refreshToken])
  const activeThread = threads.find(thread => thread.id === activeThreadId) ?? threads[0] ?? null
  const stats = {
    total: threads.length,
    open: threads.filter(thread => thread.status === 'open').length,
    pending: threads.filter(thread => thread.status === 'pending').length,
    resolved: threads.filter(thread => thread.status === 'resolved').length,
  }

  function handleStatusChange(status: SupportStatus) {
    if (!activeThread) return
    updateSupportThreadMeta(activeThread.id, { status })
    appendAuditEvent({ actor: adminEmail, action: 'Support status updated', target: activeThread.email, detail: status })
    setRefreshToken(value => value + 1)
  }

  function handlePriorityChange(priority: SupportPriority) {
    if (!activeThread) return
    updateSupportThreadMeta(activeThread.id, { priority })
    appendAuditEvent({ actor: adminEmail, action: 'Support priority updated', target: activeThread.email, detail: priority })
    setRefreshToken(value => value + 1)
  }

  function handleSendReply() {
    if (!activeThread || !reply.trim()) return
    appendSupportReply(activeThread.userId, reply.trim())
    appendAuditEvent({ actor: adminEmail, action: 'Support reply sent', target: activeThread.email, detail: reply.trim().slice(0, 80) })
    setReply('')
    setRefreshToken(value => value + 1)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl gold-text">Support Inbox</h1>
        <button
          onClick={() => exportBlob(JSON.stringify(threads, null, 2), 'taries-support-inbox.json', 'application/json')}
          className="btn-outline-gold text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export Inbox
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Threads', value: stats.total },
          { label: 'Open', value: stats.open },
          { label: 'Pending', value: stats.pending },
          { label: 'Resolved', value: stats.resolved },
        ].map(item => (
          <div key={item.label} className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{item.value}</p>
            <p className="text-xs text-brand-gold/70 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[360px,1fr] gap-4">
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-gold/10 text-xs uppercase tracking-wider text-brand-gold">Customer Threads</div>
          <div className="max-h-[640px] overflow-y-auto">
            {threads.length === 0 && (
              <div className="p-6 text-center text-white/40">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                No support threads yet
              </div>
            )}
            {threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`w-full text-left px-4 py-4 border-b border-white/5 transition-colors ${activeThread?.id === thread.id ? 'bg-brand-gold/10' : 'hover:bg-brand-black-3/60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{thread.customerName}</p>
                    <p className="text-xs text-white/40 truncate">{thread.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${thread.status === 'resolved' ? 'bg-green-500/20 text-green-400' : thread.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {thread.status}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-2 line-clamp-2">{thread.messages[thread.messages.length - 1]?.text}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/35">
                  <span>{thread.source === 'chat' ? 'Live chat' : 'Order enquiry'}</span>
                  <span>{new Date(thread.updatedAt).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 min-h-[520px] flex flex-col">
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-white/40">Select a thread to reply</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-gold/10">
                <div>
                  <h2 className="font-heading text-white text-lg">{activeThread.customerName}</h2>
                  <p className="text-sm text-white/45">{activeThread.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={activeThread.status} onChange={e => handleStatusChange(e.target.value as SupportStatus)} className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white">
                    {(['open', 'pending', 'resolved'] as const).map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <select value={activeThread.priority} onChange={e => handlePriorityChange(e.target.value as SupportPriority)} className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white">
                    {(['low', 'normal', 'high'] as const).map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {activeThread.messages.map(message => (
                  <div key={message.id} className={`flex ${message.role === 'support' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${message.role === 'support' ? 'bg-brand-gold/15 border border-brand-gold/30 text-brand-cream rounded-br-none' : 'bg-brand-black-3 text-brand-cream/85 rounded-bl-none'}`}>
                      <p>{message.text}</p>
                      <p className="mt-1 text-[10px] text-brand-cream/35">{new Date(message.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-brand-gold/10">
                <div className="flex items-center gap-2">
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Send a reply to this customer..."
                    className="flex-1 px-3 py-3 bg-brand-black-3 border border-brand-gold/20 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50"
                  />
                  <button onClick={handleSendReply} className="btn-gold flex items-center gap-2 shrink-0">
                    <Send className="w-4 h-4" /> Reply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function MarketingTab({ adminEmail }: { adminEmail: string }) {
  const [view, setView] = useState<'broadcasts' | 'promos'>('broadcasts')
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([])
  const [promos, setPromos] = useState<ManagedPromo[]>([])
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    audience: 'all-users' as AdminBroadcast['audience'],
    channel: 'banner' as AdminBroadcast['channel'],
  })
  const [promoForm, setPromoForm] = useState({
    code: '',
    label: '',
    discount: 10,
    categoryOnly: '',
    audience: 'all' as ManagedPromo['audience'],
  })

  useEffect(() => {
    setBroadcasts(readBroadcasts())
    setPromos(getManagedPromos())
  }, [])

  function createBroadcast() {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return
    const next: AdminBroadcast = {
      id: `broadcast_${Date.now()}`,
      title: broadcastForm.title.trim(),
      message: broadcastForm.message.trim(),
      audience: broadcastForm.audience,
      channel: broadcastForm.channel,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
    const updated = [next, ...broadcasts]
    setBroadcasts(updated)
    saveBroadcasts(updated)
    appendAuditEvent({ actor: adminEmail, action: 'Broadcast created', target: next.title, detail: `${next.channel} / ${next.audience}` })
    setBroadcastForm({ title: '', message: '', audience: 'all-users', channel: 'banner' })
  }

  function updateBroadcastStatus(id: string, status: AdminBroadcast['status']) {
    const updated = broadcasts.map(item => item.id === id ? { ...item, status } : item)
    setBroadcasts(updated)
    saveBroadcasts(updated)
    const current = updated.find(item => item.id === id)
    if (current?.channel === 'banner' && current.status === 'live') {
      const settings = getStoreSettings()
      saveStoreSettings({ ...settings, announcement: current.message })
    } else if (current?.channel === 'banner') {
      const settings = getStoreSettings()
      if (settings.announcement === current.message) {
        saveStoreSettings({ ...settings, announcement: '' })
      }
    }
    appendAuditEvent({ actor: adminEmail, action: 'Broadcast updated', target: current?.title ?? id, detail: status })
  }

  function removeBroadcast(id: string) {
    const current = broadcasts.find(item => item.id === id)
    const updated = broadcasts.filter(item => item.id !== id)
    setBroadcasts(updated)
    saveBroadcasts(updated)
    if (current?.channel === 'banner') {
      const settings = getStoreSettings()
      if (settings.announcement === current.message) {
        saveStoreSettings({ ...settings, announcement: '' })
      }
    }
    appendAuditEvent({ actor: adminEmail, action: 'Broadcast deleted', target: current?.title ?? id })
  }

  function createPromo() {
    if (!promoForm.code.trim() || !promoForm.label.trim()) return
    const next: ManagedPromo = {
      id: `promo_${Date.now()}`,
      code: promoForm.code.trim().toUpperCase(),
      label: promoForm.label.trim(),
      discount: Math.max(0.01, Math.min(0.95, promoForm.discount / 100)),
      categoryOnly: promoForm.categoryOnly ? [promoForm.categoryOnly as Category] : undefined,
      audience: promoForm.audience,
      active: true,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    }
    const updated = upsertManagedPromo(next)
    setPromos(updated)
    appendAuditEvent({ actor: adminEmail, action: 'Promo created', target: next.code, detail: `${promoForm.discount}%` })
    setPromoForm({ code: '', label: '', discount: 10, categoryOnly: '', audience: 'all' })
  }

  function togglePromo(id: string) {
    const promo = promos.find(item => item.id === id)
    if (!promo) return
    const updated = promos.map(item => item.id === id ? { ...item, active: !item.active } : item)
    setPromos(updated)
    saveManagedPromos(updated)
    appendAuditEvent({ actor: adminEmail, action: 'Promo toggled', target: promo.code, detail: promo.active ? 'paused' : 'activated' })
  }

  function deletePromo(id: string) {
    const promo = promos.find(item => item.id === id)
    const updated = removeManagedPromo(id)
    setPromos(updated)
    appendAuditEvent({ actor: adminEmail, action: 'Promo deleted', target: promo?.code ?? id })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl gold-text">Marketing & Promotions</h1>
        <div className="flex gap-2">
          {(['broadcasts', 'promos'] as const).map(option => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${view === option ? 'bg-brand-gold text-black font-semibold' : 'bg-brand-black-3 text-white/60 hover:text-white'}`}
            >
              {option === 'broadcasts' ? '📢 Broadcasts' : '🏷️ Promo Manager'}
            </button>
          ))}
        </div>
      </div>

      {view === 'broadcasts' ? (
        <div className="grid lg:grid-cols-[380px,1fr] gap-4">
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 space-y-3">
            <h2 className="font-heading text-white">Create Broadcast</h2>
            <input value={broadcastForm.title} onChange={e => setBroadcastForm(form => ({ ...form, title: e.target.value }))} placeholder="Campaign title" className="w-full px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white" />
            <textarea value={broadcastForm.message} onChange={e => setBroadcastForm(form => ({ ...form, message: e.target.value }))} placeholder="Message to send or publish" rows={5} className="w-full px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={broadcastForm.audience} onChange={e => setBroadcastForm(form => ({ ...form, audience: e.target.value as AdminBroadcast['audience'] }))} className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white">
                <option value="all-users">All users</option>
                <option value="customers">Customers</option>
                <option value="vendors">Vendors</option>
              </select>
              <select value={broadcastForm.channel} onChange={e => setBroadcastForm(form => ({ ...form, channel: e.target.value as AdminBroadcast['channel'] }))} className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white">
                <option value="banner">Site banner</option>
                <option value="email">Email blast</option>
                <option value="whatsapp">WhatsApp push</option>
              </select>
            </div>
            <button onClick={createBroadcast} className="btn-gold w-full">Create Broadcast</button>
          </div>

          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-white">Campaign Queue</h2>
              <button onClick={() => exportBlob(JSON.stringify(broadcasts, null, 2), 'taries-broadcasts.json', 'application/json')} className="btn-outline-gold text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
            </div>
            <div className="space-y-3">
              {broadcasts.length === 0 && <div className="text-white/40 text-sm">No broadcasts created yet.</div>}
              {broadcasts.map(item => (
                <div key={item.id} className="border border-brand-gold/10 rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-semibold">{item.title}</h3>
                      <p className="text-sm text-white/55 mt-1">{item.message}</p>
                      <p className="text-[11px] text-brand-gold/60 mt-2 uppercase tracking-wider">{item.channel} • {item.audience} • {new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${item.status === 'live' ? 'bg-green-500/20 text-green-400' : item.status === 'sent' ? 'bg-brand-gold/20 text-brand-gold' : 'bg-white/10 text-white/65'}`}>{item.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status !== 'live' && <button onClick={() => updateBroadcastStatus(item.id, 'live')} className="px-3 py-1.5 text-xs rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/35 transition-all">Go Live</button>}
                    {item.status !== 'sent' && <button onClick={() => updateBroadcastStatus(item.id, 'sent')} className="px-3 py-1.5 text-xs rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/35 transition-all">Mark Sent</button>}
                    <button onClick={() => updateBroadcastStatus(item.id, 'draft')} className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white/65 hover:bg-white/15 transition-all">Save as Draft</button>
                    <button onClick={() => removeBroadcast(item.id)} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/35 transition-all">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[380px,1fr] gap-4">
          <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 space-y-3">
            <h2 className="font-heading text-white">Create Promo Code</h2>
            <input value={promoForm.code} onChange={e => setPromoForm(form => ({ ...form, code: e.target.value.toUpperCase() }))} placeholder="CODE" className="w-full px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white uppercase" />
            <input value={promoForm.label} onChange={e => setPromoForm(form => ({ ...form, label: e.target.value }))} placeholder="10% off premium bundles" className="w-full px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min={1} max={95} value={promoForm.discount} onChange={e => setPromoForm(form => ({ ...form, discount: Number(e.target.value) }))} placeholder="Discount %" className="w-full px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white" />
              <select value={promoForm.audience} onChange={e => setPromoForm(form => ({ ...form, audience: e.target.value as ManagedPromo['audience'] }))} className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white">
                <option value="all">All shoppers</option>
                <option value="new">New customers</option>
                <option value="vip">VIP buyers</option>
              </select>
            </div>
            <select value={promoForm.categoryOnly} onChange={e => setPromoForm(form => ({ ...form, categoryOnly: e.target.value }))} className="px-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white">
              <option value="">All categories</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <button onClick={createPromo} className="btn-gold w-full">Create Promo</button>
          </div>

          <div className="space-y-4">
            <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-white">Managed Promo Codes</h2>
                <button onClick={() => exportBlob(JSON.stringify(promos, null, 2), 'taries-managed-promos.json', 'application/json')} className="btn-outline-gold text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
              </div>
              <div className="space-y-3">
                {promos.length === 0 && <div className="text-white/40 text-sm">No admin-managed promo codes yet.</div>}
                {promos.map(promo => (
                  <div key={promo.id} className="border border-brand-gold/10 rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-white font-semibold">{promo.code}</p>
                        <p className="text-sm text-white/55">{promo.label}</p>
                        <p className="text-[11px] text-brand-gold/60 mt-1 uppercase tracking-wider">{Math.round(promo.discount * 100)}% • {promo.audience} • {promo.categoryOnly?.join(', ') ?? 'all categories'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${promo.active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>{promo.active ? 'active' : 'paused'}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => togglePromo(promo.id)} className="px-3 py-1.5 text-xs rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/35 transition-all">{promo.active ? 'Pause' : 'Activate'}</button>
                      <button onClick={() => deletePromo(promo.id)} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/35 transition-all">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5">
              <h2 className="font-heading text-white mb-4">Available Coupon Library</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {getAdminCouponList().map(coupon => (
                  <div key={coupon.code} className="border border-brand-gold/10 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white font-semibold">{coupon.code}</p>
                      <span className="text-brand-gold text-sm">{Math.round(coupon.discount * 100)}%</span>
                    </div>
                    <p className="text-sm text-white/55 mt-1">{coupon.label}</p>
                    {coupon.categoryOnly && <p className="text-[11px] text-brand-gold/60 mt-2 uppercase tracking-wider">Only: {coupon.categoryOnly.join(', ')}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AuditLogTab() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    setEvents(readAuditEvents())
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return events
    const needle = query.toLowerCase()
    return events.filter(event =>
      event.actor.toLowerCase().includes(needle) ||
      event.action.toLowerCase().includes(needle) ||
      event.target.toLowerCase().includes(needle) ||
      event.detail?.toLowerCase().includes(needle),
    )
  }, [events, query])

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl gold-text">Audit Log</h1>
        <button onClick={() => exportBlob(JSON.stringify(events, null, 2), 'taries-admin-audit-log.json', 'application/json')} className="btn-outline-gold text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export Log</button>
      </div>

      <div className="relative max-w-md">
        <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by admin, action, target..." className="w-full pl-9 pr-3 py-2 bg-brand-black-3 border border-brand-gold/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Events', value: events.length },
          { label: 'Admins Active', value: new Set(events.map(event => event.actor)).size },
          { label: 'Today', value: events.filter(event => new Date(event.createdAt).toDateString() === new Date().toDateString()).length },
          { label: 'Filtered', value: filtered.length },
        ].map(item => (
          <div key={item.label} className="bg-brand-black-2 border border-brand-gold/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{item.value}</p>
            <p className="text-xs text-brand-gold/70 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-black-2 border border-brand-gold/20 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[180px,180px,1fr,1fr] gap-4 px-4 py-3 bg-brand-black-3 text-xs uppercase tracking-wider text-brand-gold">
          <span>Time</span>
          <span>Admin</span>
          <span>Action</span>
          <span>Target</span>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-white/40">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            No audit entries yet
          </div>
        )}
        <div className="divide-y divide-white/5">
          {filtered.map(event => (
            <div key={event.id} className="grid grid-cols-1 md:grid-cols-[180px,180px,1fr,1fr] gap-4 px-4 py-4 text-sm">
              <span className="text-white/45">{new Date(event.createdAt).toLocaleString()}</span>
              <span className="text-brand-gold">{event.actor}</span>
              <div>
                <p className="text-white">{event.action}</p>
                {event.detail && <p className="text-xs text-white/45 mt-1">{event.detail}</p>}
              </div>
              <span className="text-white/70">{event.target}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
