import 'server-only'

import { randomSalt } from '@/lib/security'
import type { SupportedCountry } from '@/lib/phoneCountries'
import { normalizeEmail } from '@/lib/validation'
import { createPassword, verifyPassword } from './passwords'
import {
  PB_COLLECTIONS,
  pbCreate,
  pbDelete,
  pbFirst,
  pbGet,
  pbQuote,
  pbUpdate,
  type PBRecord,
} from './pocketbase'

const SESSION_COOKIE = 'tbe_session'
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60
const ADMIN_EMAILS = new Set(['tarimoboere18@gmail.com'])

export interface RemoteUser {
  id: string
  firstName: string
  lastName: string
  email: string
  country: SupportedCountry
  phone: string
  createdAt: string
  avatar?: string
  role?: 'admin'
}

interface SessionRecord extends PBRecord {
  user_id: string
  token_hash: string
  role: string
  expires_at: string
  last_seen_at: string
}

export interface UserRow {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string
  avatar: string | null
  created_at: string
  password_hash: string | null
  password_salt: string | null
  password_version: number | null
  metadata_json: unknown
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') ?? ''
  const target = `${name}=`
  for (const segment of cookie.split(';')) {
    const trimmed = segment.trim()
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length))
    }
  }
  return null
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  if (typeof value === 'object') return value as T
  return fallback
}

function mapCountry(raw: string): SupportedCountry {
  if (raw === 'Nigeria' || raw === 'Ghana' || raw === 'China') return raw
  return 'Other'
}

export function toRemoteUser(row: UserRow): RemoteUser {
  const metadata = safeJsonParse<{ country?: string }>(row.metadata_json, {})
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: normalizeEmail(row.email),
    country: mapCountry(metadata.country ?? 'Other'),
    phone: row.phone ?? '',
    createdAt: row.created_at,
    avatar: row.avatar ?? undefined,
    role: ADMIN_EMAILS.has(normalizeEmail(row.email)) || row.role === 'admin' ? 'admin' : undefined,
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function withSecureSuffix(request: Request): string {
  return request.url.startsWith('https://') ? '; Secure' : ''
}

function buildSessionCookie(token: string, request: Request): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${withSecureSuffix(request)}`
}

function buildSessionClearCookie(request: Request): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${withSecureSuffix(request)}`
}

function requestIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return request.headers.get('x-real-ip') ?? null
}

export async function createRemoteSession(userId: string, role: string, request: Request): Promise<string> {
  const token = randomSalt(32)
  const tokenHash = await sha256Hex(token)
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()

  await pbCreate(PB_COLLECTIONS.sessions, {
    user_id: userId,
    token_hash: tokenHash,
    role,
    created_at: now,
    expires_at: expiresAt,
    last_seen_at: now,
    ip_address: requestIp(request),
    user_agent: request.headers.get('user-agent') ?? null,
  })

  return buildSessionCookie(token, request)
}

export async function clearRemoteSession(request: Request): Promise<string> {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return buildSessionClearCookie(request)
  const tokenHash = await sha256Hex(token)
  const session = await pbFirst<SessionRecord>(
    PB_COLLECTIONS.sessions,
    `token_hash = ${pbQuote(tokenHash)}`,
  )
  if (session) await pbDelete(PB_COLLECTIONS.sessions, session.id)
  return buildSessionClearCookie(request)
}

export async function getRemoteSessionUser(request: Request): Promise<RemoteUser | null> {
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return null

  const tokenHash = await sha256Hex(token)
  const session = await pbFirst<SessionRecord>(
    PB_COLLECTIONS.sessions,
    `token_hash = ${pbQuote(tokenHash)}`,
  )
  if (!session) return null

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await pbDelete(PB_COLLECTIONS.sessions, session.id)
    return null
  }

  await pbUpdate(PB_COLLECTIONS.sessions, session.id, { last_seen_at: new Date().toISOString() })

  const user = await pbGet<UserRow & PBRecord>(PB_COLLECTIONS.users, session.user_id).catch(() => null)
  return user ? toRemoteUser(user) : null
}

export async function requireRemoteAdmin(request: Request): Promise<RemoteUser | null> {
  const user = await getRemoteSessionUser(request)
  if (!user) return null
  return user.role === 'admin' ? user : null
}

export async function verifyRemotePassword(row: UserRow, password: string): Promise<boolean> {
  return verifyPassword(
    { hash: row.password_hash, salt: row.password_salt, version: row.password_version },
    normalizeEmail(row.email),
    password
  )
}

export async function createRemotePassword(_email: string, password: string): Promise<{ hash: string; salt: string; version: number }> {
  return createPassword(password)
}
