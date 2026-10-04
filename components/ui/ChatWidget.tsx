'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { apiRequest } from '@/lib/remoteApi'
import { shouldHideEngagementUi } from '@/lib/engagementVisibility'

interface ChatMessage {
  id: string
  role: 'user' | 'support'
  text: string
  timestamp: number
}

interface RemoteMessageRow {
  id: string
  sender_role: string
  body: string | null
  kind?: string | null
  created_at: string
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'support',
  text: "Hi! 👑 Welcome to Taries Beauty Emporium. How can we help you today? Send us a message and our team will reply right here.",
  timestamp: Date.now(),
}

const QUICK_REPLIES = [
  'Track my order',
  'Custom wig enquiry',
  'Shipping to Nigeria',
  'Product question',
]

const AUTO_RESPONSES: Record<string, string> = {
  'Track my order': "Please visit our Track Order page or share your Order ID and we'll look it up for you right away!",
  'Custom wig enquiry': "We'd love to create your perfect wig! 💄 Visit our Custom Wigs page or WhatsApp us at +234 903 541 2919 with your requirements.",
  'Shipping to Nigeria': "We ship via air freight from Guangzhou, China. Delivery to Nigeria takes 7–14 business days. Tracking is provided within 48 hours of dispatch.",
  'Product question': "Ask away! Or browse our full catalogue in the Shop. Our team is also available on WhatsApp at +234 903 541 2919.",
}

const DEFAULT_RESPONSE = "Thanks for your message! 💛 Our team will get back to you shortly. For urgent enquiries, WhatsApp us at +234 903 541 2919."

function guestChatKey(userId: string) {
  return `taries-chat-${userId}`
}

function conversationKey(userId: string) {
  return `taries-support-conversation-${userId}`
}

function loadGuestMessages(userId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [GREETING]
  try {
    const raw = localStorage.getItem(guestChatKey(userId))
    return raw ? JSON.parse(raw) : [GREETING]
  } catch {
    return [GREETING]
  }
}

function saveGuestMessages(userId: string, msgs: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(guestChatKey(userId), JSON.stringify(msgs))
  } catch {
    // ignore
  }
}

function mapRemoteMessage(row: RemoteMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.sender_role === 'customer' ? 'user' : 'support',
    text: row.body || '',
    timestamp: new Date(row.created_at).getTime(),
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const [userId, setUserId] = useState('guest')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastCreatedAtRef = useRef<string>('1970-01-01T00:00:00.000Z')
  const pathname = usePathname()
  const hidden = shouldHideEngagementUi(pathname)
  const isGuest = userId === 'guest'

  useEffect(() => {
    if (hidden) return
    setMounted(true)
    const user = getCurrentUser()
    const uid = user?.id || 'guest'
    setUserId(uid)
    if (uid === 'guest') {
      setMessages(loadGuestMessages(uid))
    }
  }, [hidden])

  // Resolve the support conversation for signed-in customers.
  useEffect(() => {
    if (isGuest || !userId) return
    try {
      const stored = localStorage.getItem(conversationKey(userId))
      if (stored) setConversationId(stored)
    } catch {
      // ignore
    }
  }, [isGuest, userId])

  // Load existing messages when the conversation is known / panel opens.
  useEffect(() => {
    if (isGuest || !conversationId || !open) return
    let active = true
    void (async () => {
      const res = await apiRequest<{ messages?: RemoteMessageRow[] }>(
        `/conversations/${encodeURIComponent(conversationId)}/messages`
      )
      if (!active) return
      const rows = res.ok && Array.isArray(res.data?.messages) ? res.data.messages : []
      if (rows.length > 0) {
        const mapped = rows.map(mapRemoteMessage)
        lastCreatedAtRef.current = rows[rows.length - 1].created_at
        setMessages(mapped)
      } else {
        setMessages(prev => (prev.length > 0 ? prev : [GREETING]))
      }
      void apiRequest(`/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'PATCH' })
    })()
    return () => {
      active = false
    }
  }, [conversationId, open, isGuest])

  // Long-poll for new replies while the panel is open.
  useEffect(() => {
    if (isGuest || !conversationId || !open) return
    let active = true
    void (async () => {
      while (active) {
        const res = await apiRequest<{ messages?: RemoteMessageRow[]; typing?: { user_id: string } | null }>(
          `/conversations/${encodeURIComponent(conversationId)}/poll?since=${encodeURIComponent(lastCreatedAtRef.current)}`
        )
        if (!active) break
        if (res.ok && Array.isArray(res.data?.messages) && res.data.messages.length > 0) {
          const rows = res.data.messages
          lastCreatedAtRef.current = rows[rows.length - 1].created_at
          setMessages(prev => {
            const base = prev.filter(m => !m.id.startsWith('local_'))
            const seen = new Set(base.map(m => m.id))
            const additions = rows.map(mapRemoteMessage).filter(m => !seen.has(m.id))
            return additions.length > 0 ? [...base, ...additions] : base
          })
          setTyping(false)
        }
        if (!active) break
        if (res.data?.typing) setTyping(true)
      }
    })()
    return () => {
      active = false
    }
  }, [conversationId, open, isGuest])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const addGuestSupportMessage = useCallback((uid: string, text: string, isOpen: boolean) => {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'support',
      text,
      timestamp: Date.now(),
    }
    setMessages(prev => {
      const updated = [...prev, msg]
      saveGuestMessages(uid, updated)
      return updated
    })
    if (!isOpen) setUnread(u => u + 1)
  }, [])

  async function ensureConversation(firstMessage: string): Promise<string | null> {
    if (conversationId) return conversationId
    const res = await apiRequest<{ id?: string }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ kind: 'support', subject: 'Website chat', initial_message: firstMessage }),
    })
    const id = res.ok ? res.data?.id ?? null : null
    if (id) {
      try {
        localStorage.setItem(conversationKey(userId), id)
      } catch {
        // ignore
      }
      setConversationId(id)
    }
    return id
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setInput('')

    const userMsg: ChatMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    if (isGuest) {
      const updated = [...messages, userMsg]
      saveGuestMessages(userId, updated)
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        const response = AUTO_RESPONSES[trimmed] || DEFAULT_RESPONSE
        addGuestSupportMessage(userId, response, open)
      }, 1500)
      return
    }

    setSending(true)
    try {
      const id = await ensureConversation(trimmed)
      if (!id) throw new Error('unavailable')
      if (conversationId) {
        const res = await apiRequest(`/conversations/${encodeURIComponent(id)}/messages`, {
          method: 'POST',
          body: JSON.stringify({ kind: 'text', body: trimmed }),
        })
        if (!res.ok) throw new Error('unavailable')
      }
    } catch {
      addGuestSupportMessage(userId, 'We could not deliver your message right now. Please try again or WhatsApp us at +234 903 541 2919.', open)
    } finally {
      setSending(false)
    }
  }, [addGuestSupportMessage, conversationId, isGuest, messages, open, sending, userId])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && input.trim()) {
      void sendMessage(input)
    }
  }

  const showQuickReplies = messages.length <= 1 && (messages.length === 0 || messages[0].id === 'greeting')

  if (hidden || !mounted) return null

  return (
    <>
      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-drawer"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-brand-black-2 border border-brand-gold/20 rounded-2xl shadow-gold-xl flex flex-col overflow-hidden"
            style={{ maxHeight: '500px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gold/20 bg-brand-black-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-brand-black font-bold text-xs font-heading">TB</div>
                <div>
                  <p className="font-heading text-sm font-bold text-brand-gold leading-tight">Taries Beauty Support</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="font-body text-[10px] text-green-400">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-brand-cream/50 hover:text-brand-cream transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {msg.role === 'support' && (
                    <div className="w-6 h-6 rounded-full bg-gold-gradient flex items-center justify-center text-brand-black font-bold text-[9px] shrink-0 mt-1">TB</div>
                  )}
                  <div className={`max-w-[75%] px-3 py-2 font-body text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-gold/20 border border-brand-gold/30 rounded-2xl rounded-tr-none text-brand-cream'
                      : 'bg-brand-black-3 rounded-2xl rounded-tl-none text-brand-cream/90'
                  }`}>
                    <p>{msg.text}</p>
                    <p className="text-[10px] text-brand-cream/30 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div className="flex justify-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gold-gradient flex items-center justify-center text-brand-black font-bold text-[9px] shrink-0 mt-1">TB</div>
                  <div className="bg-brand-black-3 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-brand-gold/60"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick replies */}
              {showQuickReplies && !typing && (
                <div className="flex flex-wrap gap-2">
                  {QUICK_REPLIES.map(chip => (
                    <button
                      key={chip}
                      onClick={() => void sendMessage(chip)}
                      className="font-body text-xs px-3 py-1.5 rounded-full border border-brand-gold/30 text-brand-gold/80 hover:bg-brand-gold/10 hover:border-brand-gold/60 hover:text-brand-gold transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-brand-gold/20 bg-brand-black-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isGuest ? 'Type a message...' : 'Message Taries support...'}
                  className="flex-1 bg-brand-black-2 border border-brand-gold/20 rounded-xl px-3 py-2 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                />
                <button
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || sending}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() && !sending
                      ? 'bg-gold-gradient text-brand-black hover:opacity-90'
                      : 'bg-brand-black-3 text-brand-cream/20'
                  }`}
                >
                  <Send size={15} />
                </button>
              </div>
              {isGuest && (
                <div className="mt-2 text-center">
                  <a
                    href="https://wa.me/2349035412919"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-xs text-brand-gold/60 hover:text-brand-gold transition-colors"
                  >
                    💬 Chat live on WhatsApp → or sign in to message the team
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-4 z-[80] w-14 h-14 rounded-full bg-gold-gradient shadow-gold-xl flex items-center justify-center"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={22} className="text-brand-black" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle size={22} className="text-brand-black" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white font-body"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
