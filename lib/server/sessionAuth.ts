import 'server-only'

import { hashSecret, randomSalt } from '@/lib/security'
import type { SupportedCountry } from '@/lib/phoneCountries'
import { normalizeEmail } from '@/lib/validation'
import { requireDatabase } from './cloudflare'

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

interface SessionRow {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
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
  metadata_json: string | null
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

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
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

export async function createRemoteSession(userId: string, role: string, request: Request): Promise<string> {
  const db = await requireDatabase()
  const token = randomSalt(32)
  const tokenHash = await sha256Hex(token)
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
  await db.prepare(`
    INSERT INTO sessions (
      id, user_id, token_hash, role, created_at, expires_at, last_seen_at, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    tokenHash,
    role,
    now,
    expiresAt,
    now,
    request.headers.get('cf-connecting-ip') ?? null,
    request.headers.get('user-agent') ?? null,
  ).run()
  return buildSessionCookie(token, request)
}

export async function clearRemoteSession(request: Request): Promise<string> {
  const db = await requireDatabase()
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return buildSessionClearCookie(request)
  const tokenHash = await sha256Hex(token)
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
  return buildSessionClearCookie(request)
}

export async function getRemoteSessionUser(request: Request): Promise<RemoteUser | null> {
  const db = await requireDatabase()
  const token = getCookie(request, SESSION_COOKIE)
  if (!token) return null

  const tokenHash = await sha256Hex(token)
  const session = await db.prepare(`
    SELECT id, user_id, token_hash, expires_at
    FROM sessions
    WHERE token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first<SessionRow>()

  if (!session) return null
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run()
    return null
  }

  await db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').bind(new Date().toISOString(), session.id).run()
  const user = await db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, avatar, created_at, password_hash, password_salt, password_version, metadata_json
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(session.user_id).first<UserRow>()
  return user ? toRemoteUser(user) : null
}

export async function requireRemoteAdmin(request: Request): Promise<RemoteUser | null> {
  const user = await getRemoteSessionUser(request)
  if (!user) return null
  return user.role === 'admin' ? user : null
}

export async function verifyRemotePassword(row: UserRow, password: string): Promise<boolean> {
  if (!row.password_hash || !row.password_salt) return false
  const hash = await hashSecret(`${normalizeEmail(row.email)}::${password}`, row.password_salt)
  return hash === row.password_hash
}

export async function createRemotePassword(email: string, password: string): Promise<{ hash: string; salt: string; version: number }> {
  const salt = randomSalt()
  const hash = await hashSecret(`${normalizeEmail(email)}::${password}`, salt)
  return { hash, salt, version: 2 }
}
