import type { AdminLevel, User } from './auth'
import type { Order } from './orders'

export type AdminConsoleRole = AdminLevel | 'customer'
export type SupportStatus = 'open' | 'pending' | 'resolved'
export type SupportPriority = 'low' | 'normal' | 'high'

export interface SupportMessage {
  id: string
  role: 'user' | 'support'
  text: string
  timestamp: number
}

export interface SupportThread {
  id: string
  userId: string
  customerName: string
  email: string
  source: 'chat' | 'order'
  status: SupportStatus
  priority: SupportPriority
  messages: SupportMessage[]
  updatedAt: number
}

interface SupportThreadMeta {
  status?: SupportStatus
  priority?: SupportPriority
}

export interface AdminBroadcast {
  id: string
  title: string
  message: string
  audience: 'all-users' | 'customers' | 'vendors'
  channel: 'banner' | 'email' | 'whatsapp'
  status: 'draft' | 'live' | 'sent'
  createdAt: string
}

export interface AuditEvent {
  id: string
  actor: string
  action: string
  target: string
  detail?: string
  createdAt: string
}

const CHAT_PREFIX = 'taries-chat-'
const THREAD_META_KEY = 'taries-support-thread-meta'
const AUDIT_KEY = 'taries-admin-audit-log'
const BROADCAST_KEY = 'taries-admin-broadcasts'

function canUseStorage() {
  return typeof window !== 'undefined'
}

function readJSON<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!canUseStorage()) return
  localStorage.setItem(key, JSON.stringify(value))
}

function getThreadMetaMap() {
  return readJSON<Record<string, SupportThreadMeta>>(THREAD_META_KEY, {})
}

function saveThreadMetaMap(meta: Record<string, SupportThreadMeta>) {
  writeJSON(THREAD_META_KEY, meta)
}

export function getAdminRoleLabel(level?: AdminLevel | null): string {
  switch (level) {
    case 'super-admin':
      return 'Super Admin'
    case 'staff-admin':
      return 'Staff Admin'
    case 'support-admin':
      return 'Support Admin'
    case 'finance-admin':
      return 'Finance Admin'
    default:
      return 'Customer'
  }
}

export function readSupportThreads(users: User[], orders: Order[]): SupportThread[] {
  if (!canUseStorage()) return []

  const meta = getThreadMetaMap()
  const threads: SupportThread[] = []

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith(CHAT_PREFIX)) continue

    const userId = key.slice(CHAT_PREFIX.length)
    const messages = readJSON<SupportMessage[]>(key, []).sort((a, b) => a.timestamp - b.timestamp)
    if (!messages.length) continue

    const user = users.find(entry => entry.id === userId)
    const matchedOrder = user
      ? orders.find(order => order.customer.email.toLowerCase() === user.email.toLowerCase())
      : null

    const threadId = `thread-${userId}`
    const last = messages[messages.length - 1]
    const threadMeta = meta[threadId] ?? {}

    threads.push({
      id: threadId,
      userId,
      customerName: user ? `${user.firstName} ${user.lastName}` : matchedOrder ? `${matchedOrder.customer.firstName} ${matchedOrder.customer.lastName}` : 'Guest Visitor',
      email: user?.email ?? matchedOrder?.customer.email ?? 'guest@local',
      source: user ? 'chat' : 'order',
      status: threadMeta.status ?? 'open',
      priority: threadMeta.priority ?? 'normal',
      messages,
      updatedAt: last.timestamp,
    })
  }

  if (threads.length === 0) {
    const seeded = orders.slice(0, 2).map((order, index) => ({
      id: `seeded-${order.orderId}`,
      userId: order.customer.email.toLowerCase(),
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      email: order.customer.email,
      source: 'order' as const,
      status: index === 0 ? 'open' as const : 'pending' as const,
      priority: index === 0 ? 'high' as const : 'normal' as const,
      updatedAt: new Date(order.date).getTime(),
      messages: [
        {
          id: `seed-msg-${order.orderId}`,
          role: 'user' as const,
          text: `I need help with order ${order.orderId}.`,
          timestamp: new Date(order.date).getTime(),
        },
      ],
    }))

    return seeded.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  return threads.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function updateSupportThreadMeta(threadId: string, patch: SupportThreadMeta) {
  const meta = getThreadMetaMap()
  saveThreadMetaMap({
    ...meta,
    [threadId]: {
      ...meta[threadId],
      ...patch,
    },
  })
}

export function appendSupportReply(userId: string, text: string): SupportMessage[] {
  const key = `${CHAT_PREFIX}${userId}`
  const existing = readJSON<SupportMessage[]>(key, [])
  const nextMessage: SupportMessage = {
    id: `support_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role: 'support',
    text,
    timestamp: Date.now(),
  }
  const next = [...existing, nextMessage]
  writeJSON(key, next)
  return next
}

export function readAuditEvents(): AuditEvent[] {
  return readJSON<AuditEvent[]>(AUDIT_KEY, [])
}

export function appendAuditEvent(event: Omit<AuditEvent, 'id' | 'createdAt'>) {
  const next: AuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...event,
  }
  writeJSON(AUDIT_KEY, [next, ...readAuditEvents()].slice(0, 250))
}

export function readBroadcasts(): AdminBroadcast[] {
  return readJSON<AdminBroadcast[]>(BROADCAST_KEY, [])
}

export function saveBroadcasts(broadcasts: AdminBroadcast[]) {
  writeJSON(BROADCAST_KEY, broadcasts)
}
