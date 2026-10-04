import 'server-only'

import {
  PB_COLLECTIONS,
  pbCreate,
  pbDelete,
  pbFirst,
  pbGet,
  pbList,
  pbListAll,
  pbQuote,
  pbUpdate,
  PocketBaseError,
  type PBRecord,
} from './pocketbase'
import { createPassword, verifyPassword } from './passwords'

/**
 * Taries Beauty API — full port of the former Cloudflare Worker
 * (api/src/index.js) to the self-hosted Node runtime.
 *
 * Storage: PocketBase (tbe_* collections). No Cloudflare services.
 * Response shapes intentionally preserve the legacy D1 contract: JSON
 * columns are re-serialized to strings because the storefront parses them.
 */

// ---------- env ----------
function apiEnv() {
  return {
    allowedOrigins:
      process.env.ALLOWED_ORIGINS ||
      'https://tariesbeauty.com,https://www.tariesbeauty.com,http://tariesbeauty.com,http://www.tariesbeauty.com,http://localhost:3000',
    publicSiteUrl: process.env.PUBLIC_SITE_URL || 'https://www.tariesbeauty.com',
    flwSecretKey: process.env.FLW_SECRET_KEY || '',
    flwWebhookHash: process.env.FLW_WEBHOOK_HASH || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
  }
}

// ---------- utils ----------
const json = (data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })

const err = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, error: message, ...extra }, { status })

const ok = (data: Record<string, unknown> = {}) => json({ ok: true, ...data })

const nowIso = () => new Date().toISOString()

const lower = (s: unknown) => (s || '').toString().trim().toLowerCase()
const digitsOnly = (s: unknown) => (s || '').toString().replace(/\D/g, '')
const normalizeCountry = (value: unknown) => {
  const country = (value || '').toString().trim()
  if (country === 'Nigeria' || country === 'Ghana' || country === 'China') return country
  return 'Other'
}
const ADMIN_EMAILS = new Set(['tarimoboere18@gmail.com'])
const isAdminEmail = (email: unknown) => ADMIN_EMAILS.has(lower(email))
const getEffectiveRole = (email: unknown, role: unknown): string =>
  isAdminEmail(email) ? 'admin' : role ? String(role) : 'customer'
const FX_RATES: Record<string, number> = { NGN: 1620, GHS: 16.2, USD: 1, CNY: 7.25 }
const FLW_SETTLE_CURRENCY = new Set(['NGN', 'GHS', 'USD'])
const MAX_PRODUCT_MEDIA_JSON_BYTES = 24 * 1024
const MAX_INLINE_PRODUCT_MEDIA_JSON_BYTES = 2 * 1024 * 1024
const IMAGE_UPLOAD_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const VIDEO_UPLOAD_MIMES = ['video/mp4', 'video/webm']

function round2(n: unknown) {
  return Math.round(Number(n || 0) * 100) / 100
}

function estimateJsonBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value ?? null)).length
}

function isInlineDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:')
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!match) return null
  const [, mime, base64] = match
  try {
    const bytes = Buffer.from(base64, 'base64')
    return { mime, bytes }
  } catch {
    return null
  }
}

function validateProductMediaPayload(body: Record<string, unknown> | null) {
  const images = Array.isArray(body?.images) ? body.images : []
  const videos = Array.isArray(body?.videos) ? body.videos : []
  const hasInlineImages = images.some((src) => isInlineDataUrl(src))
  if (hasInlineImages && estimateJsonBytes(images) > MAX_INLINE_PRODUCT_MEDIA_JSON_BYTES) {
    return 'Product images are too large. Please use fewer images or smaller photos.'
  }
  if (!hasInlineImages && estimateJsonBytes(images) > MAX_PRODUCT_MEDIA_JSON_BYTES) {
    return 'Product images are too large. Please use fewer images or smaller photos.'
  }
  if (estimateJsonBytes(videos) > 8 * 1024) {
    return 'Video data is too large. Please shorten the video links and try again.'
  }
  return null
}

async function storeInlineMediaAsset(ownerUserId: string, source: string): Promise<string> {
  const parsed = parseDataUrl(source)
  if (!parsed) throw new Error('Invalid image data. Please choose the photo again.')
  if (!IMAGE_UPLOAD_MIMES.includes(parsed.mime)) {
    throw new Error('Unsupported image format. Please use JPG, PNG, WEBP, or AVIF.')
  }
  if (parsed.bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error('Product image is too large. Please use a smaller photo.')
  }

  const created = await pbCreate<PBRecord>(PB_COLLECTIONS.mediaAssets, {
    owner_user_id: ownerUserId,
    kind: 'image',
    url: '',
    data_b64: parsed.bytes.toString('base64'),
    size_bytes: parsed.bytes.byteLength,
    mime: parsed.mime,
    created_at: nowIso(),
  })
  const url = `/api/media/${created.id}`
  await pbUpdate(PB_COLLECTIONS.mediaAssets, created.id, { url })
  return url
}

async function normalizeProductImagesForStorage(ownerUserId: string, images: unknown): Promise<string[]> {
  const list = Array.isArray(images) ? images : []
  const normalized: string[] = []
  for (const image of list) {
    if (typeof image !== 'string') continue
    const trimmed = image.trim()
    if (!trimmed) continue
    normalized.push(isInlineDataUrl(trimmed) ? await storeInlineMediaAsset(ownerUserId, trimmed) : trimmed)
  }
  return normalized
}

function toChargeCurrency(orderCurrency: unknown) {
  const value = String(orderCurrency || 'USD')
  if (FLW_SETTLE_CURRENCY.has(value)) return value
  return 'USD'
}

function toChargeAmount(grandTotalUsd: unknown, orderCurrency: unknown) {
  const currency = toChargeCurrency(orderCurrency)
  const fx = FX_RATES[currency] || 1
  return { currency, amount: round2(Number(grandTotalUsd || 0) * fx) }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getCookie(req: Request, name: string): string | null {
  const c = req.headers.get('cookie') || ''
  const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[1]) : null
}

function getBearerToken(req: Request): string | null {
  const auth = (req.headers.get('authorization') || '').trim()
  if (!auth) return null
  const [scheme, ...rest] = auth.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null
  const token = rest.join(' ').trim()
  return token || null
}

const SESSION_COOKIE = 'tbe_session'
const SESSION_TTL_DAYS = 30

function getRequestSessionToken(req: Request) {
  return getBearerToken(req) || getCookie(req, SESSION_COOKIE)
}

function setCookieHeader(value: string, maxAgeSec: number) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=None`
}

function clearCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`
}

function corsHeaders(origin: string | null) {
  const allowed = apiEnv().allowedOrigins.split(',').map((s) => s.trim())
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] || '*'
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-csrf-token',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

function withCors(res: Response, origin: string | null): Response {
  const headers = new Headers(res.headers)
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v))
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-frame-options', 'DENY')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('cross-origin-resource-policy', 'same-site')
  return new Response(res.body, { status: res.status, headers })
}

function constantTimeEqual(a: unknown, b: unknown) {
  const sa = String(a || '')
  const sb = String(b || '')
  if (sa.length !== sb.length) return false
  let out = 0
  for (let i = 0; i < sa.length; i += 1) out |= sa.charCodeAt(i) ^ sb.charCodeAt(i)
  return out === 0
}

function strField(v: unknown, max: number, opts: { required?: boolean } = {}): { value?: string | null; error?: string } {
  if (v == null) return opts.required ? { error: 'required' } : { value: null }
  const s = String(v).trim()
  if (opts.required && !s) return { error: 'required' }
  if (s.length > max) return { error: `max length ${max}` }
  return { value: s }
}

// ---------- legacy row mapping ----------
type JsonSpec = Record<string, string | null>

function legacyJson(value: unknown, fallback: string | null): string | null {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function legacyRow<T extends PBRecord>(record: T, jsonSpec: JsonSpec): Record<string, unknown> {
  const out: Record<string, unknown> = { ...record }
  for (const [field, fallback] of Object.entries(jsonSpec)) {
    out[field] = legacyJson(out[field], fallback)
  }
  return out
}

// ---------- pocketbase helpers ----------
async function pbByIds<T extends PBRecord>(collection: string, ids: string[]): Promise<Map<string, T>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const map = new Map<string, T>()
  const chunkSize = 50
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const filter = chunk.map((id) => `id = ${pbQuote(id)}`).join(' || ')
    const records = await pbListAll<T>(collection, { filter })
    for (const record of records) map.set(record.id, record)
  }
  return map
}

async function countWhere(collection: string, filter?: string): Promise<number> {
  const result = await pbList(collection, { filter, perPage: 1, fields: 'id' })
  return result.totalItems
}

interface UserRecord extends PBRecord {
  role: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  avatar: string | null
  whatsapp: string | null
  password_hash: string | null
  password_salt: string | null
  password_version: number | null
  metadata_json: { country?: string } | string | null
  created_at: string
}

interface SessionRecord extends PBRecord {
  user_id: string
  token_hash: string
  role: string
  created_at: string
  expires_at: string
  last_seen_at: string
}

interface SessionInfo {
  id: string
  user_id: string
  token_hash: string
  session_role: string
  created_at: string
  expires_at: string
  last_seen_at: string
  email: string
  user_role: string
  first_name: string
  last_name: string
  avatar: string | null
  whatsapp: string | null
  phone: string | null
  role: string
}

function metadataCountry(metadata: unknown): string {
  if (!metadata) return 'Other'
  if (typeof metadata === 'string') {
    try {
      return normalizeCountry((JSON.parse(metadata) as { country?: string }).country)
    } catch {
      return 'Other'
    }
  }
  if (typeof metadata === 'object') return normalizeCountry((metadata as { country?: string }).country)
  return 'Other'
}

// ---------- auth ----------
async function getSession(req: Request): Promise<SessionInfo | null> {
  const tok = getRequestSessionToken(req)
  if (!tok) return null
  const tokenHash = await sha256Hex(tok)
  const s = await pbFirst<SessionRecord>(PB_COLLECTIONS.sessions, `token_hash = ${pbQuote(tokenHash)}`)
  if (!s) return null
  if (new Date(s.expires_at).getTime() < Date.now()) {
    await pbDelete(PB_COLLECTIONS.sessions, s.id)
    return null
  }
  await pbUpdate(PB_COLLECTIONS.sessions, s.id, { last_seen_at: nowIso() })
  const u = await pbGet<UserRecord>(PB_COLLECTIONS.users, s.user_id).catch(() => null)
  if (!u) return null
  const role = getEffectiveRole(u.email, u.role || s.role)
  if (role !== u.role) {
    await pbUpdate(PB_COLLECTIONS.users, u.id, { role, updated_at: nowIso() })
  }
  if (role !== s.role) {
    await pbUpdate(PB_COLLECTIONS.sessions, s.id, { role })
  }
  return {
    id: s.id,
    user_id: u.id,
    token_hash: s.token_hash,
    session_role: s.role,
    created_at: s.created_at,
    expires_at: s.expires_at,
    last_seen_at: s.last_seen_at,
    email: u.email,
    user_role: u.role,
    first_name: u.first_name,
    last_name: u.last_name,
    avatar: u.avatar,
    whatsapp: u.whatsapp,
    phone: u.phone,
    role,
  }
}

async function requireAuth(
  req: Request,
  role: string | string[] | null = null
): Promise<{ error?: Response; session?: SessionInfo }> {
  const s = await getSession(req)
  if (!s) return { error: err(401, 'unauthenticated') }
  if (role) {
    const roles = Array.isArray(role) ? role : [role]
    if (!roles.includes(s.role)) return { error: err(403, 'forbidden') }
  }
  return { session: s }
}

async function createSessionForUser(user: UserRecord, role: string, req: Request): Promise<{ tok: string; csrf: string }> {
  const tok = randomToken(32)
  const tokenHash = await sha256Hex(tok)
  const now = nowIso()
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400e3).toISOString()
  await pbCreate(PB_COLLECTIONS.sessions, {
    user_id: user.id,
    token_hash: tokenHash,
    role,
    created_at: now,
    expires_at: expires,
    last_seen_at: now,
    ip_address: requestIp(req),
    user_agent: req.headers.get('user-agent') || null,
  })
  return { tok, csrf: randomToken(16) }
}

function requestIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') ?? null
}

// ---------- email (Resend) ----------
const MAIL_FROM = 'Taries Beauty Emporium <no-reply@tariesbeauty.com>'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = apiEnv().resendApiKey
  if (!key) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html }),
    })
    return r.ok
  } catch {
    return false
  }
}

function brandedEmail(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#0a0908;font-family:Georgia,serif;color:#f5e9d3">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#15110d;border:1px solid rgba(212,175,55,.2);border-radius:16px">
  <h1 style="margin:0 0 16px 0;font-size:22px;color:#d4af37;letter-spacing:.5px">${title}</h1>
  <div style="font-size:15px;line-height:1.6;color:#f5e9d3">${body}</div>
  <hr style="border:0;border-top:1px solid rgba(212,175,55,.15);margin:24px 0">
  <p style="font-size:12px;color:#9c8966">— Taries Beauty Emporium • <a href="https://tariesbeauty.com" style="color:#d4af37">tariesbeauty.com</a></p>
</div></body></html>`
}

// ---------- routes ----------
type RouteHandler = (req: Request, params: Record<string, string>) => Promise<Response>

interface RouteDef {
  method: string
  regex: RegExp
  keys: string[]
  handler: RouteHandler
}

const routes: RouteDef[] = []
function route(method: string, pattern: string, handler: RouteHandler) {
  const keys: string[] = []
  const regex = new RegExp(
    '^' +
      pattern.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1))
        return '([^/]+)'
      }) +
      '/?$'
  )
  routes.push({ method, regex, keys, handler })
}

// ----- health -----
route('GET', '/health', async () => ok({ service: 'taries-beauty-api', time: nowIso() }))

// ----- auth -----
route('POST', '/auth/register', async (req) => {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const email = lower(body.email)
  const password = String(body.password || '')
  if (!email || !email.includes('@')) return err(400, 'invalid email')
  if (password.length < 6) return err(400, 'password too short')

  const existing = await pbFirst(PB_COLLECTIONS.users, `email = ${pbQuote(email)}`)
  if (existing) return err(409, 'email already registered')

  const pwd = await createPassword(password)
  const now = nowIso()
  const role = getEffectiveRole(email, 'customer')
  const firstName = String(body.firstName || body.first_name || 'Friend')
  const lastName = String(body.lastName || body.last_name || '')

  const created = await pbCreate<UserRecord>(PB_COLLECTIONS.users, {
    role,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: body.phone || null,
    password_hash: pwd.hash,
    password_salt: pwd.salt,
    password_version: pwd.version,
    avatar: body.avatar || null,
    whatsapp: body.whatsapp || null,
    created_at: now,
    updated_at: now,
    metadata_json: { country: normalizeCountry(body.country) },
  })

  const { tok, csrf } = await createSessionForUser(created, role, req)
  const headers = new Headers({ 'content-type': 'application/json' })
  headers.append('set-cookie', setCookieHeader(tok, SESSION_TTL_DAYS * 86400))
  headers.append('set-cookie', setCsrfCookieHeader(csrf))
  return new Response(
    JSON.stringify({
      ok: true,
      csrfToken: csrf,
      sessionToken: tok,
      user: {
        id: created.id,
        email,
        role,
        firstName,
        lastName,
        country: normalizeCountry(body.country),
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
      },
    }),
    { status: 200, headers }
  )
})

route('POST', '/auth/login', async (req) => {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const email = lower(body.email)
  const u = await pbFirst<UserRecord>(PB_COLLECTIONS.users, `email = ${pbQuote(email)}`)
  if (!u) return err(401, 'invalid credentials')
  const valid = await verifyPassword(
    { hash: u.password_hash, salt: u.password_salt, version: u.password_version },
    u.email,
    String(body.password || '')
  )
  if (!valid) return err(401, 'invalid credentials')
  const role = getEffectiveRole(u.email, u.role)
  if (role !== u.role) {
    await pbUpdate(PB_COLLECTIONS.users, u.id, { role, updated_at: nowIso() })
  }

  const { tok, csrf } = await createSessionForUser(u, role, req)
  const headers = new Headers({ 'content-type': 'application/json' })
  headers.append('set-cookie', setCookieHeader(tok, SESSION_TTL_DAYS * 86400))
  headers.append('set-cookie', setCsrfCookieHeader(csrf))
  return new Response(
    JSON.stringify({
      ok: true,
      csrfToken: csrf,
      sessionToken: tok,
      user: {
        id: u.id,
        email: u.email,
        role,
        firstName: u.first_name,
        lastName: u.last_name,
        country: metadataCountry(u.metadata_json),
        avatar: u.avatar,
        phone: u.phone,
        whatsapp: u.whatsapp,
      },
    }),
    { status: 200, headers }
  )
})

route('POST', '/auth/logout', async (req) => {
  const tok = getRequestSessionToken(req)
  if (tok) {
    const tokenHash = await sha256Hex(tok)
    const session = await pbFirst<SessionRecord>(PB_COLLECTIONS.sessions, `token_hash = ${pbQuote(tokenHash)}`)
    if (session) await pbDelete(PB_COLLECTIONS.sessions, session.id)
  }
  const headers = new Headers({ 'content-type': 'application/json' })
  headers.append('set-cookie', clearCookieHeader())
  headers.append('set-cookie', clearCsrfCookieHeader())
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
})

route('GET', '/auth/me', async (req) => {
  const s = await getSession(req)
  if (!s) return ok({ user: null, sessionToken: null })
  const u = await pbGet<UserRecord>(PB_COLLECTIONS.users, s.user_id).catch(() => null)
  const role = u ? getEffectiveRole(u.email, u.role) : null
  if (u && role !== u.role) {
    await pbUpdate(PB_COLLECTIONS.users, u.id, { role, updated_at: nowIso() })
  }
  const sessionToken = getRequestSessionToken(req)
  const headers = new Headers({ 'content-type': 'application/json' })
  const csrf = await ensureCsrfCookie(req, headers)
  return new Response(
    JSON.stringify({
      ok: true,
      csrfToken: csrf,
      sessionToken,
      user: u
        ? {
            id: u.id,
            email: u.email,
            role,
            firstName: u.first_name,
            lastName: u.last_name,
            country: metadataCountry(u.metadata_json),
            avatar: u.avatar,
            phone: u.phone,
            whatsapp: u.whatsapp,
            createdAt: u.created_at,
          }
        : null,
    }),
    { status: 200, headers }
  )
})

route('PATCH', '/auth/profile', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const existing = await pbGet<UserRecord>(PB_COLLECTIONS.users, session.user_id).catch(() => null)
  if (!existing) return err(404, 'not found')

  const firstName = (body.firstName ?? existing.first_name ?? '').toString().trim()
  const lastName = (body.lastName ?? existing.last_name ?? '').toString().trim()
  const phone = body.phone == null ? existing.phone : (body.phone || '').toString().trim()
  const avatar = body.avatar == null ? existing.avatar : (body.avatar || null)
  const currentMeta =
    existing.metadata_json && typeof existing.metadata_json === 'object' ? existing.metadata_json : {}
  const metadata = {
    ...currentMeta,
    country: normalizeCountry((body.country as string | undefined) ?? (currentMeta as { country?: string }).country),
  }

  if (!firstName) return err(400, 'firstName required')
  if (!lastName) return err(400, 'lastName required')

  await pbUpdate(PB_COLLECTIONS.users, session.user_id, {
    first_name: firstName,
    last_name: lastName,
    phone: phone || null,
    avatar,
    metadata_json: metadata,
    updated_at: nowIso(),
  })

  return ok({
    user: {
      id: existing.id,
      email: existing.email,
      role: getEffectiveRole(existing.email, existing.role),
      firstName,
      lastName,
      country: normalizeCountry(metadata.country),
      avatar: avatar || undefined,
      phone: phone || '',
      whatsapp: existing.whatsapp,
      createdAt: existing.created_at,
    },
  })
})

route('GET', '/auth/csrf', async (req) => {
  const s = await getSession(req)
  if (!s) return err(401, 'not authenticated')
  const headers = new Headers({ 'content-type': 'application/json' })
  const csrf = await ensureCsrfCookie(req, headers)
  return new Response(JSON.stringify({ ok: true, csrfToken: csrf }), { status: 200, headers })
})

// ----- users (admin) -----
route('GET', '/admin/users', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const users = await pbListAll<UserRecord>(PB_COLLECTIONS.users, { sort: '-created_at', perPage: 100 })
  return ok({
    users: users.slice(0, 500).map((u) =>
      legacyRow(u, { metadata_json: null })
    ),
  })
})

route('PATCH', '/admin/users/:id', async (req, params) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  if (!body.role) return err(400, 'nothing to update')
  const record = await pbGet(PB_COLLECTIONS.users, params.id).catch(() => null)
  if (!record) return err(404, 'not found')
  await pbUpdate(PB_COLLECTIONS.users, params.id, { role: body.role, updated_at: nowIso() })
  return ok()
})

// ----- vendors -----
route('POST', '/vendors/apply', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (existing) return ok({ vendor: existing })
  const now = nowIso()
  const created = await pbCreate<PBRecord>(PB_COLLECTIONS.vendors, {
    user_id: session.user_id,
    brand_name: body.brandName || '',
    business_name: body.businessName || '',
    display_name: body.displayName || '',
    bio: body.bio || '',
    status: 'pending',
    created_at: now,
    updated_at: now,
  })
  return ok({ vendor: { id: created.id, status: 'pending' } })
})

route('GET', '/vendors/me', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  return ok({ vendor: v })
})

route('PATCH', '/vendors/me', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (!existing) return err(404, 'not found')
  await pbUpdate(PB_COLLECTIONS.vendors, existing.id, {
    brand_name: body.brandName ?? existing.brand_name,
    business_name: body.businessName ?? existing.business_name,
    display_name: body.displayName ?? existing.display_name,
    bio: body.bio ?? existing.bio,
    updated_at: nowIso(),
  })
  return ok()
})

route('GET', '/admin/vendors', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const vendors = await pbListAll<PBRecord>(PB_COLLECTIONS.vendors, { sort: '-created_at', perPage: 100 })
  const users = await pbByIds<UserRecord>(PB_COLLECTIONS.users, vendors.map((v) => String(v.user_id || '')))
  const rows = vendors.slice(0, 500).map((v) => {
    const u = users.get(String(v.user_id))
    return {
      ...v,
      email: u?.email ?? null,
      first_name: u?.first_name ?? null,
      last_name: u?.last_name ?? null,
      avatar: u?.avatar ?? null,
      phone: u?.phone ?? null,
    }
  })
  return ok({ vendors: rows })
})

route('PATCH', '/admin/vendors/:id', async (req, params) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  if (!['pending', 'approved', 'featured', 'removed'].includes(String(body.status))) return err(400, 'invalid status')
  const v = await pbGet<PBRecord>(PB_COLLECTIONS.vendors, params.id).catch(() => null)
  if (!v) return err(404, 'vendor not found')
  await pbUpdate(PB_COLLECTIONS.vendors, params.id, { status: body.status, updated_at: nowIso() })
  if (body.status === 'approved' || body.status === 'featured') {
    const u = await pbGet<UserRecord>(PB_COLLECTIONS.users, String(v.user_id)).catch(() => null)
    if (u && u.role === 'customer') {
      await pbUpdate(PB_COLLECTIONS.users, u.id, { role: 'vendor', updated_at: nowIso() })
    }
  }
  return ok()
})

// ----- products -----
const PRODUCT_JSON_SPEC: JsonSpec = {
  features_json: '[]',
  variants_json: '[]',
  images_json: '[]',
  videos_json: '[]',
}

async function listStoreProducts(filter: string, sort: string, perPage = 500) {
  const products = await pbListAll<PBRecord>(PB_COLLECTIONS.vendorProducts, { filter, sort, perPage: 100 })
  const limited = products.slice(0, perPage)
  const vendors = await pbByIds<PBRecord>(PB_COLLECTIONS.vendors, limited.map((p) => String(p.vendor_id || '')))
  const users = await pbByIds<UserRecord>(
    PB_COLLECTIONS.users,
    [...vendors.values()].map((v) => String(v.user_id || ''))
  )
  return limited.map((p) => {
    const v = vendors.get(String(p.vendor_id))
    const u = v ? users.get(String(v.user_id)) : null
    return {
      ...legacyRow(p, PRODUCT_JSON_SPEC),
      brand_name: v?.brand_name ?? null,
      display_name: v?.display_name ?? null,
      vendor_whatsapp: u?.whatsapp ?? null,
      vendor_email: u?.email ?? null,
    }
  })
}

route('GET', '/products', async () => {
  const products = await listStoreProducts(
    `active = true && (status = 'approved' || status = 'featured')`,
    '-added_at'
  )
  return ok({ products })
})

route('GET', '/products/overrides', async () => {
  const overrides = await pbListAll<PBRecord>(PB_COLLECTIONS.productOverrides)
  return ok({ overrides: overrides.map((o) => legacyRow(o, { images_json: null })) })
})

async function ensureAdminVendor(userId: string): Promise<string> {
  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(userId)}`)
  if (existing?.id) return existing.id
  const now = nowIso()
  const created = await pbCreate<PBRecord>(PB_COLLECTIONS.vendors, {
    user_id: userId,
    brand_name: 'Taries Beauty Emporium',
    business_name: 'Taries Beauty Emporium',
    display_name: 'Taries Beauty Emporium',
    bio: 'Store-managed products',
    status: 'featured',
    created_at: now,
    updated_at: now,
  })
  return created.id
}

function productSlug(name: unknown, slug: unknown, suffix: string) {
  return (
    String(slug || name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    suffix
  )
}

async function createProduct(params: {
  vendorId: string
  body: Record<string, unknown>
  status: string
  images: string[]
}): Promise<{ id: string; slug: string }> {
  const b = params.body
  const now = nowIso()
  const slug = productSlug(b.name, b.slug, randomToken(3))
  const created = await pbCreate<PBRecord>(PB_COLLECTIONS.vendorProducts, {
    vendor_id: params.vendorId,
    slug,
    name: b.name,
    category: b.category || 'beauty',
    price: Number(b.price),
    original_price: b.originalPrice ? Number(b.originalPrice) : null,
    description: b.description || '',
    short_desc: b.shortDesc || '',
    features_json: Array.isArray(b.features) ? b.features : [],
    variants_json: Array.isArray(b.variants) ? b.variants : [],
    images_json: params.images,
    videos_json: Array.isArray(b.videos) ? b.videos : [],
    video: b.video || null,
    badge: b.badge || null,
    whatsapp: b.whatsapp || null,
    in_stock: b.inStock !== false,
    stock_count: b.stockCount ?? null,
    weight_kg: Number(b.weightKg),
    sensitive: Boolean(b.sensitive),
    model_3d: b.model3d || null,
    active: true,
    status: params.status,
    added_at: now,
    updated_at: now,
  })
  return { id: created.id, slug }
}

route('GET', '/admin/products', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const products = await pbListAll<PBRecord>(PB_COLLECTIONS.vendorProducts, { sort: '-added_at', perPage: 100 })
  const vendors = await pbByIds<PBRecord>(PB_COLLECTIONS.vendors, products.map((p) => String(p.vendor_id || '')))
  const rows = products.slice(0, 500).map((p) => {
    const v = vendors.get(String(p.vendor_id))
    return {
      ...legacyRow(p, PRODUCT_JSON_SPEC),
      brand_name: v?.brand_name ?? null,
      display_name: v?.display_name ?? null,
    }
  })
  return ok({ products: rows })
})

route('POST', '/admin/products', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!b.name || !b.price) return err(400, 'name and price required')
  if (!b.weightKg || Number(b.weightKg) <= 0) return err(400, 'weightKg required (must be > 0)')
  const mediaError = validateProductMediaPayload(b)
  if (mediaError) return err(413, mediaError)
  let normalizedImages: string[]
  try {
    normalizedImages = await normalizeProductImagesForStorage(session.user_id, b.images)
  } catch (error) {
    return err(400, error instanceof Error ? error.message : 'Could not process product images.')
  }
  const vendorId = await ensureAdminVendor(session.user_id)
  const created = await createProduct({ vendorId, body: b, status: 'featured', images: normalizedImages })
  return ok({ id: created.id, slug: created.slug })
})

route('GET', '/vendors/me/products', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (!v) return ok({ products: [] })
  const products = await pbListAll<PBRecord>(PB_COLLECTIONS.vendorProducts, {
    filter: `vendor_id = ${pbQuote(String(v.id))}`,
    sort: '-added_at',
  })
  return ok({ products: products.map((p) => legacyRow(p, PRODUCT_JSON_SPEC)) })
})

route('POST', '/vendors/me/products', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (!v) return err(403, 'not a vendor')
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!b.name || !b.price) return err(400, 'name and price required')
  if (!b.weightKg || Number(b.weightKg) <= 0) return err(400, 'weightKg required (must be > 0)')
  const mediaError = validateProductMediaPayload(b)
  if (mediaError) return err(413, mediaError)
  let normalizedImages: string[]
  try {
    normalizedImages = await normalizeProductImagesForStorage(session.user_id, b.images)
  } catch (error) {
    return err(400, error instanceof Error ? error.message : 'Could not process product images.')
  }
  const created = await createProduct({ vendorId: String(v.id), body: b, status: 'pending', images: normalizedImages })
  return ok({ id: created.id, slug: created.slug })
})

route('PATCH', '/vendors/me/products/:id', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (!v) return err(403, 'not a vendor')
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const mediaError = validateProductMediaPayload(b)
  if (mediaError) return err(413, mediaError)
  let normalizedImages: string[] | null = null
  if (Object.prototype.hasOwnProperty.call(b, 'images')) {
    try {
      normalizedImages = await normalizeProductImagesForStorage(session.user_id, b.images)
    } catch (error) {
      return err(400, error instanceof Error ? error.message : 'Could not process product images.')
    }
  }
  const existing = await pbFirst<PBRecord>(
    PB_COLLECTIONS.vendorProducts,
    `id = ${pbQuote(params.id)} && vendor_id = ${pbQuote(String(v.id))}`
  )
  if (!existing) return err(404, 'not found')

  const map: Record<string, { field: string; transform?: (v: unknown, key: string) => unknown }> = {
    name: { field: 'name' },
    category: { field: 'category' },
    price: { field: 'price' },
    originalPrice: { field: 'original_price' },
    description: { field: 'description' },
    shortDesc: { field: 'short_desc' },
    features: { field: 'features_json', transform: (v) => (Array.isArray(v) ? v : []) },
    variants: { field: 'variants_json', transform: (v) => (Array.isArray(v) ? v : []) },
    images: { field: 'images_json', transform: () => normalizedImages || [] },
    videos: { field: 'videos_json', transform: (v) => (Array.isArray(v) ? v : []) },
    video: { field: 'video' },
    badge: { field: 'badge' },
    whatsapp: { field: 'whatsapp' },
    inStock: { field: 'in_stock', transform: (v) => Boolean(v) },
    stockCount: { field: 'stock_count' },
    weightKg: { field: 'weight_kg' },
    sensitive: { field: 'sensitive', transform: (v) => Boolean(v) },
    model3d: { field: 'model_3d' },
    active: { field: 'active', transform: (v) => Boolean(v) },
  }
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(b)) {
    const def = map[key]
    if (!def) continue
    patch[def.field] = def.transform ? def.transform(b[key], key) : b[key]
  }
  if (!Object.keys(patch).length) return err(400, 'nothing to update')
  patch.updated_at = nowIso()
  await pbUpdate(PB_COLLECTIONS.vendorProducts, params.id, patch)
  return ok()
})

route('DELETE', '/vendors/me/products/:id', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (!v) return err(403, 'not a vendor')
  const existing = await pbFirst<PBRecord>(
    PB_COLLECTIONS.vendorProducts,
    `id = ${pbQuote(params.id)} && vendor_id = ${pbQuote(String(v.id))}`
  )
  if (existing) await pbDelete(PB_COLLECTIONS.vendorProducts, existing.id)
  return ok()
})

route('PATCH', '/admin/products/:id', async (req, params) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (b.status && !['pending', 'approved', 'featured', 'removed'].includes(String(b.status))) {
    return err(400, 'invalid status')
  }
  const patch: Record<string, unknown> = {}
  if (b.status) patch.status = b.status
  if (typeof b.active === 'boolean') patch.active = b.active
  if (!Object.keys(patch).length) return err(400, 'nothing to update')
  patch.updated_at = nowIso()
  const existing = await pbGet(PB_COLLECTIONS.vendorProducts, params.id).catch(() => null)
  if (!existing) return err(404, 'not found')
  await pbUpdate(PB_COLLECTIONS.vendorProducts, params.id, patch)
  return ok()
})

// ----- orders -----
route('POST', '/orders', async (req) => {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!b.orderId || !b.items) return err(400, 'orderId + items required')
  const s = await getSession(req)
  const now = nowIso()
  const subtotalUsd = Number(b.subtotalUsd ?? b.subtotalUSD ?? 0)
  const shippingUsd = Number(b.shippingUsd ?? b.shippingUSD ?? 0)
  const grandTotalUsd = Number(b.grandTotalUsd ?? b.grandTotalUSD ?? 0)
  const discountUsd = Number(b.discountUsd ?? b.discountUSD ?? 0)
  const orderId = String(b.orderId)

  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.orders, `order_id = ${pbQuote(orderId)}`)
  const payload = {
    order_id: orderId,
    user_id: s ? s.user_id : null,
    date: b.date || now,
    status: b.status || 'pending',
    payment_status: b.paymentStatus || 'pending',
    payment_method: b.paymentMethod || 'unknown',
    currency: b.currency || 'USD',
    subtotal_usd: Number.isFinite(subtotalUsd) ? subtotalUsd : 0,
    shipping_usd: Number.isFinite(shippingUsd) ? shippingUsd : 0,
    grand_total_usd: Number.isFinite(grandTotalUsd) ? grandTotalUsd : 0,
    discount_usd: Number.isFinite(discountUsd) ? discountUsd : 0,
    coupon_code: b.couponCode || null,
    customer_json: b.customer || {},
    shipping_json: b.shipping || {},
    notes: b.notes || null,
    gift_message: b.giftMessage || null,
    updated_at: now,
    ...(existing ? {} : { created_at: now }),
  }
  if (existing) await pbUpdate(PB_COLLECTIONS.orders, existing.id, payload)
  else await pbCreate(PB_COLLECTIONS.orders, payload)

  await pbDeleteWhereItems(orderId)
  const itemList = Array.isArray(b.items) ? (b.items as Record<string, unknown>[]) : []
  for (let index = 0; index < itemList.length; index += 1) {
    const it = itemList[index]
    const product = it.product as Record<string, unknown> | undefined
    const productId = it.productId || it.id || product?.id || 'unknown'
    const productName = it.productName || it.name || product?.name || 'Item'
    const unitPriceUsd = Number(it.unitPriceUsd ?? it.priceUsd ?? product?.price ?? 0)
    const quantity = Math.max(1, Number(it.quantity || 1))
    await pbCreate(PB_COLLECTIONS.orderItems, {
      order_id: orderId,
      product_id: productId,
      product_name: productName,
      unit_price_usd: Number.isFinite(unitPriceUsd) ? unitPriceUsd : 0,
      quantity,
      selected_variants_json: it.selectedVariants || {},
      product_snapshot_json: it.productSnapshot || it.product || it,
      position: index + 1,
      created_at: now,
    })
  }
  return ok({ orderId })
})

async function pbDeleteWhereItems(orderId: string) {
  const items = await pbListAll<PBRecord>(PB_COLLECTIONS.orderItems, {
    filter: `order_id = ${pbQuote(orderId)}`,
  })
  for (const item of items) await pbDelete(PB_COLLECTIONS.orderItems, item.id)
}

const ORDER_JSON_SPEC: JsonSpec = { customer_json: null, shipping_json: null }
const ORDER_ITEM_JSON_SPEC: JsonSpec = { selected_variants_json: '{}', product_snapshot_json: null }

route('GET', '/orders/:id', async (req, params) => {
  const url = new URL(req.url)
  const emailQuery = lower(url.searchParams.get('email') || '')
  const o = await pbFirst<PBRecord>(PB_COLLECTIONS.orders, `order_id = ${pbQuote(params.id)}`)
  if (!o) return err(404, 'not found')
  const session = await getSession(req)
  const isAdmin = session?.role === 'admin'
  const isOwner = Boolean(session?.user_id && o.user_id && session.user_id === o.user_id)
  const customer = (o.customer_json || {}) as { email?: string }
  const customerEmail = lower(customer.email)
  const hasEmailMatch = Boolean(emailQuery && customerEmail && emailQuery === customerEmail)
  if (!isAdmin && !isOwner && !hasEmailMatch) return err(403, 'forbidden')
  const items = await pbListAll<PBRecord>(PB_COLLECTIONS.orderItems, {
    filter: `order_id = ${pbQuote(params.id)}`,
    sort: 'position',
  })
  return ok({
    order: legacyRow(o, ORDER_JSON_SPEC),
    items: items.map((i) => legacyRow(i, ORDER_ITEM_JSON_SPEC)),
  })
})

route('GET', '/orders/me', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const orders = await pbListAll<PBRecord>(PB_COLLECTIONS.orders, {
    filter: `user_id = ${pbQuote(session.user_id)}`,
    sort: '-created_at',
  })
  return ok({ orders: orders.map((o) => legacyRow(o, ORDER_JSON_SPEC)) })
})

route('GET', '/admin/orders', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const orders = await pbListAll<PBRecord>(PB_COLLECTIONS.orders, { sort: '-created_at', perPage: 100 })
  return ok({ orders: orders.slice(0, 500).map((o) => legacyRow(o, ORDER_JSON_SPEC)) })
})

route('PATCH', '/admin/orders/:id', async (req, params) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  if (b.status) patch.status = b.status
  if (b.paymentStatus) patch.payment_status = b.paymentStatus
  if (!Object.keys(patch).length) return err(400, 'nothing to update')
  patch.updated_at = nowIso()
  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.orders, `order_id = ${pbQuote(params.id)}`)
  if (!existing) return err(404, 'not found')
  await pbUpdate(PB_COLLECTIONS.orders, existing.id, patch)
  return ok()
})

async function verifyFlutterwaveAndMarkOrderPaid(
  txRef: string,
  transactionId: string | number | null = null
): Promise<Record<string, unknown>> {
  const secretKey = apiEnv().flwSecretKey
  if (!secretKey) return { error: 'flutterwave not configured' }
  if (!txRef) return { error: 'tx_ref required' }

  const order = await pbFirst<PBRecord>(PB_COLLECTIONS.orders, `order_id = ${pbQuote(txRef)}`)
  if (!order) return { error: 'order not found' }

  const verifyUrl = transactionId
    ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`
    : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`
  const response = await fetch(verifyUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
  })
  const payload = (await response.json().catch(() => null)) as { data?: Record<string, unknown>; message?: string } | null
  const data = payload?.data
  if (!response.ok || !data) {
    return { error: payload?.message || 'flutterwave verification failed' }
  }

  const expected = toChargeAmount(order.grand_total_usd, order.currency || 'USD')
  const chargedAmount = Number(data.amount ?? data.charged_amount ?? 0)
  const chargedCurrency = String(data.currency || '').toUpperCase()
  const status = String(data.status || '').toLowerCase()
  const sameRef = String(data.tx_ref || '').trim() === txRef
  const amountOk = Math.abs(chargedAmount - expected.amount) <= 0.5
  const currencyOk = chargedCurrency === expected.currency
  const paid = status === 'successful' && sameRef && currencyOk && amountOk

  const wasAlreadyPaid = String(order.payment_status || '').toLowerCase() === 'paid'
  if (paid) {
    await pbUpdate(PB_COLLECTIONS.orders, order.id, {
      payment_status: 'paid',
      status: order.status === 'pending' ? 'processing' : order.status,
      updated_at: nowIso(),
    })
    if (!wasAlreadyPaid) {
      try {
        await finalizeOrderAfterPayment(txRef)
      } catch {
        /* stock/email best-effort */
      }
    }
  }

  return {
    ok: paid,
    txRef,
    expected,
    chargedAmount,
    chargedCurrency,
    verificationStatus: status || 'unknown',
    paymentStatus: paid ? 'paid' : order.payment_status,
  }
}

async function finalizeOrderAfterPayment(orderId: string): Promise<boolean> {
  const o = await pbFirst<PBRecord>(PB_COLLECTIONS.orders, `order_id = ${pbQuote(orderId)}`)
  if (!o) return false
  const items = await pbListAll<PBRecord>(PB_COLLECTIONS.orderItems, {
    filter: `order_id = ${pbQuote(orderId)}`,
  })
  for (const it of items) {
    try {
      const product = await pbFirst<PBRecord>(
        PB_COLLECTIONS.vendorProducts,
        `id = ${pbQuote(String(it.product_id))}`
      )
      const qty = Number(it.quantity || 1)
      if (product) {
        const current = Number(product.stock_count ?? 0)
        await pbUpdate(PB_COLLECTIONS.vendorProducts, product.id, {
          stock_count: Math.max(current - qty, 0),
        })
      }
      await pbCreate(PB_COLLECTIONS.stockMovements, {
        product_id: it.product_id,
        delta: -qty,
        reason: 'order',
        ref_id: orderId,
        created_at: nowIso(),
      })
    } catch {
      /* best-effort stock bookkeeping */
    }
  }
  const cust = (o.customer_json || {}) as { email?: string }
  if (cust.email) {
    await sendEmail(
      cust.email,
      `Order ${orderId} confirmed`,
      brandedEmail(
        'Thank you for your order ✨',
        `<p>Your order <strong>${orderId}</strong> has been received and payment was confirmed.</p>
         <p>Total: <strong>${o.currency} ${Number(o.grand_total_usd || 0).toFixed(2)}</strong></p>
         <p>You will receive tracking information when your parcel ships.</p>`
      )
    )
  }
  return true
}

route('POST', '/payments/flutterwave/initialize', async (req) => {
  const secretKey = apiEnv().flwSecretKey
  if (!secretKey) return err(503, 'flutterwave not configured')

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const txRef = String(b.orderId || '').trim()
  const customer = (b.customer || {}) as Record<string, unknown>
  const email = lower(customer.email)
  const name = String(customer.name || `${customer.firstName || ''} ${customer.lastName || ''}` || 'Customer').trim()
  const phone = String(customer.phone || customer.phone_number || '').trim()
  if (!txRef || !email.includes('@')) return err(400, 'orderId and customer email required')

  const order = await pbFirst<PBRecord>(PB_COLLECTIONS.orders, `order_id = ${pbQuote(txRef)}`)
  if (!order) return err(404, 'order not found')
  const orderCustomer = (order.customer_json || {}) as { email?: string }
  const orderCustomerEmail = lower(orderCustomer.email)
  if (orderCustomerEmail && orderCustomerEmail !== email) return err(400, 'customer email mismatch')

  const { currency, amount } = toChargeAmount(order.grand_total_usd, order.currency || 'USD')
  const baseSiteUrl = apiEnv().publicSiteUrl.replace(/\/+$/, '')
  const redirectUrl = `${baseSiteUrl}/checkout/complete`
  const paymentMethod = String(b.paymentMethod || 'card')
  const paymentOptions = paymentMethod === 'mobile' ? 'card, mobilemoneyghana, banktransfer' : 'card, banktransfer, ussd'

  const initResponse = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency,
      redirect_url: redirectUrl,
      payment_options: paymentOptions,
      customer: { email, name: name || 'Customer', phonenumber: phone || undefined },
      customizations: { title: 'Taries Beauty Emporium', description: `Order ${txRef}` },
      meta: { order_id: txRef },
    }),
  })
  const initPayload = (await initResponse.json().catch(() => null)) as { data?: { link?: string }; message?: string } | null
  const link = initPayload?.data?.link
  if (!initResponse.ok || !link) {
    return err(502, initPayload?.message || 'flutterwave initialization failed')
  }

  return ok({ txRef, link, chargeAmount: amount, chargeCurrency: currency })
})

route('GET', '/payments/flutterwave/verify', async (req) => {
  const url = new URL(req.url)
  const txRef = String(url.searchParams.get('tx_ref') || '').trim()
  const transactionId = url.searchParams.get('transaction_id')
  const result = await verifyFlutterwaveAndMarkOrderPaid(txRef, transactionId)
  if (result.error) return err(400, String(result.error))
  return ok(result)
})

route('POST', '/payments/flutterwave/webhook', async (req) => {
  const secretHash = apiEnv().flwWebhookHash.trim()
  if (!secretHash) return err(503, 'webhook hash not configured')
  const signature = req.headers.get('verif-hash') || req.headers.get('flutterwave-signature') || ''
  if (!constantTimeEqual(secretHash, signature)) return err(401, 'invalid webhook signature')

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const data = (body.data || {}) as Record<string, unknown>
  const txRef = String(data.tx_ref || body.tx_ref || '').trim()
  const txStatus = String(data.status || body.status || '').toLowerCase()
  if (!txRef) return ok({ ignored: true })
  if (txStatus !== 'successful') return ok({ ignored: true, status: txStatus || 'unknown' })

  const txId = data.id || body.id || null
  const result = await verifyFlutterwaveAndMarkOrderPaid(txRef, txId as string | number | null)
  if (result.error) return err(400, String(result.error))
  return ok({ received: true, ...result })
})

// ----- newsletter / stock alerts -----
route('POST', '/newsletter', async (req) => {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const email = lower(b.email)
  if (!email.includes('@')) return err(400, 'invalid email')
  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.newsletterSubscribers, `email = ${pbQuote(email)}`)
  if (!existing) {
    await pbCreate(PB_COLLECTIONS.newsletterSubscribers, {
      email,
      source: b.source || 'footer',
      created_at: nowIso(),
    })
  }
  return ok()
})

route('POST', '/stock-alerts', async (req) => {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!b.slug || !b.email) return err(400, 'slug and email required')
  const email = lower(b.email)
  const slug = String(b.slug)
  const existing = await pbFirst<PBRecord>(
    PB_COLLECTIONS.stockAlertRequests,
    `slug = ${pbQuote(slug)} && email = ${pbQuote(email)}`
  )
  if (!existing) {
    await pbCreate(PB_COLLECTIONS.stockAlertRequests, { slug, email, created_at: nowIso() })
  }
  return ok()
})

// ----- store settings -----
route('GET', '/settings', async () => {
  const s = await pbFirst<PBRecord>(PB_COLLECTIONS.storeSettings)
  return ok({ settings: s })
})

route('PATCH', '/admin/settings', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.storeSettings)
  if (!existing) return err(404, 'settings not initialized')
  await pbUpdate(PB_COLLECTIONS.storeSettings, existing.id, {
    store_name: b.storeName ?? existing.store_name,
    announcement: b.announcement ?? existing.announcement,
    whatsapp: b.whatsapp ?? existing.whatsapp,
    email: b.email ?? existing.email,
    maintenance_mode:
      typeof b.maintenanceMode === 'boolean' ? b.maintenanceMode : existing.maintenance_mode,
    updated_at: nowIso(),
  })
  return ok()
})

// ----- admin stats -----
route('GET', '/admin/stats', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const users = await countWhere(PB_COLLECTIONS.users)
  const vendors = await countWhere(PB_COLLECTIONS.vendors)
  const pendingVendors = await countWhere(PB_COLLECTIONS.vendors, `status = 'pending'`)
  const products = await countWhere(PB_COLLECTIONS.vendorProducts, `active = true`)
  const pendingProducts = await countWhere(PB_COLLECTIONS.vendorProducts, `status = 'pending'`)
  const orders = await countWhere(PB_COLLECTIONS.orders)
  const paidOrders = await pbListAll<PBRecord>(PB_COLLECTIONS.orders, {
    filter: `payment_status = 'paid'`,
    fields: 'id,grand_total_usd',
  })
  const revenueUsd = paidOrders.reduce((sum, o) => sum + Number(o.grand_total_usd || 0), 0)
  return ok({
    stats: { users, vendors, pendingVendors, products, pendingProducts, orders, revenueUsd },
  })
})

// ----- CSRF -----
const CSRF_COOKIE = 'tbe_csrf'
function setCsrfCookieHeader(value: string) {
  return `${CSRF_COOKIE}=${value}; Path=/; Max-Age=${SESSION_TTL_DAYS * 86400}; Secure; SameSite=None`
}
function clearCsrfCookieHeader() {
  return `${CSRF_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=None`
}
async function ensureCsrfCookie(req: Request, headers: Headers) {
  const existing = getCookie(req, CSRF_COOKIE)
  if (existing) return existing
  const tok = randomToken(16)
  headers.append('set-cookie', setCsrfCookieHeader(tok))
  return tok
}
function csrfGuard(req: Request, method: string): Response | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null
  if (getBearerToken(req)) return null
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'
  if (path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/logout')) return null
  const sess = getCookie(req, SESSION_COOKIE)
  if (!sess) return null
  const cookie = getCookie(req, CSRF_COOKIE)
  const header = req.headers.get('x-csrf-token')
  if (!cookie || !header || cookie !== header) return err(403, 'csrf token mismatch')
  return null
}

// ----- rate limiting (in-process store; former Cloudflare KV) -----
const rateBuckets = new Map<string, { count: number; resetAt: number }>()
async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}
async function rateLimitGuard(req: Request): Promise<Response | null> {
  const ip = requestIp(req) || 'anon'
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const isAuth = path.startsWith('/auth/')
  const allowed = await rateLimit(`${isAuth ? 'a' : 'g'}:${ip}`, isAuth ? 10 : 60, 1)
  if (!allowed) return err(429, 'rate limited')
  return null
}

// ----- audit log -----
async function audit(req: Request, userId: string | null, action: string, targetType: string | null = null, targetId: string | null = null, meta: unknown = null) {
  try {
    await pbCreate(PB_COLLECTIONS.auditLog, {
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      meta_json: meta ?? null,
      ip: requestIp(req),
      ua: req.headers.get('user-agent') || null,
      created_at: nowIso(),
    })
  } catch {
    /* audit is best-effort */
  }
}

// ----- media -----
const MEDIA_LIMITS = {
  image: { max: 5 * 1024 * 1024, mimes: IMAGE_UPLOAD_MIMES },
  video: { max: 5 * 1024 * 1024, mimes: VIDEO_UPLOAD_MIMES },
}

route('POST', '/media/upload', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const ctype = req.headers.get('content-type') || ''
  if (!ctype.startsWith('multipart/form-data')) return err(400, 'multipart/form-data required')
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return err(400, 'invalid form')
  }
  const file = form.get('file')
  if (!file || typeof file === 'string') return err(400, 'file required')
  const blob = file as File
  const mime = blob.type || 'application/octet-stream'
  const isImage = MEDIA_LIMITS.image.mimes.includes(mime)
  const isVideo = MEDIA_LIMITS.video.mimes.includes(mime)
  if (!isImage && !isVideo) return err(400, 'unsupported mime')
  const kind = isImage ? 'image' : 'video'
  const limit = MEDIA_LIMITS[kind as 'image' | 'video']
  const buf = Buffer.from(await blob.arrayBuffer())
  if (buf.byteLength > limit.max) return err(413, `max size ${limit.max} bytes`)

  const created = await pbCreate<PBRecord>(PB_COLLECTIONS.mediaAssets, {
    owner_user_id: session.user_id,
    kind,
    url: '',
    data_b64: buf.toString('base64'),
    size_bytes: buf.byteLength,
    mime,
    created_at: nowIso(),
  })
  const url = `/api/media/${created.id}`
  await pbUpdate(PB_COLLECTIONS.mediaAssets, created.id, { url })
  return ok({ id: created.id, url, kind, mime, size: buf.byteLength })
})

route('GET', '/media/:id', async (_req, params) => {
  const row = await pbGet<PBRecord>(PB_COLLECTIONS.mediaAssets, params.id).catch(() => null)
  if (!row) return err(404, 'not found')
  if (row.data_b64) {
    const buf = Buffer.from(String(row.data_b64), 'base64')
    return new Response(buf, {
      status: 200,
      headers: {
        'content-type': String(row.mime || 'application/octet-stream'),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  }
  return Response.redirect(String(row.url), 302)
})

route('DELETE', '/media/:id', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const row = await pbGet<PBRecord>(PB_COLLECTIONS.mediaAssets, params.id).catch(() => null)
  if (!row) return err(404, 'not found')
  if (row.owner_user_id !== session.user_id && session.role !== 'admin') return err(403, 'forbidden')
  await pbDelete(PB_COLLECTIONS.mediaAssets, params.id)
  return ok()
})

// ----- chat: conversations + messages -----
function hasCJK(s: string) {
  return /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(s || '')
}

// Translation relied on Cloudflare Workers AI (`@cf/meta/m2m100-1.2b`) which is
// banned. Without it, messages keep their original text (the previous code had
// the same graceful fallback when AI was unavailable).
async function translateText(_text: string, _srcLang: string, _tgtLang: string): Promise<string | null> {
  return null
}

async function canAccessConversation(conv: PBRecord, session: SessionInfo) {
  if (session.role === 'admin') return true
  if (conv.kind === 'support') return conv.customer_id === session.user_id || conv.admin_id === session.user_id
  if (conv.kind === 'vendor') return conv.customer_id === session.user_id || conv.vendor_id === session.user_id
  return false
}

route('GET', '/conversations', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  let conversations: PBRecord[]
  if (session.role === 'admin') {
    conversations = await pbListAll<PBRecord>(PB_COLLECTIONS.conversations, {
      sort: '-last_message_at,-created_at',
      perPage: 100,
    })
  } else if (session.role === 'vendor') {
    const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
    conversations = await pbListAll<PBRecord>(PB_COLLECTIONS.conversations, {
      filter: `vendor_id = ${pbQuote(String(v?.id || 'none'))}`,
      sort: '-last_message_at,-created_at',
      perPage: 100,
    })
  } else {
    conversations = await pbListAll<PBRecord>(PB_COLLECTIONS.conversations, {
      filter: `customer_id = ${pbQuote(session.user_id)}`,
      sort: '-last_message_at,-created_at',
      perPage: 100,
    })
  }
  conversations = conversations.slice(0, 200)
  const users = await pbByIds<UserRecord>(PB_COLLECTIONS.users, conversations.map((c) => String(c.customer_id || '')))
  const vendors = await pbByIds<PBRecord>(PB_COLLECTIONS.vendors, conversations.map((c) => String(c.vendor_id || '')))
  const rows = conversations.map((c) => {
    const u = users.get(String(c.customer_id))
    const v = vendors.get(String(c.vendor_id))
    return {
      ...c,
      customer_first_name: u?.first_name ?? null,
      customer_last_name: u?.last_name ?? null,
      customer_email: u?.email ?? null,
      vendor_brand_name: v?.brand_name ?? null,
    }
  })
  return ok({ conversations: rows })
})

route('POST', '/conversations', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const kind = b.kind === 'vendor' ? 'vendor' : 'support'
  const subject = strField(b.subject, 200).value || (kind === 'support' ? 'Support request' : 'New message')
  let vendorId: string | null = null
  let adminId: string | null = null
  if (kind === 'vendor') {
    if (!b.vendor_id && !b.vendorId) return err(400, 'vendor_id required')
    vendorId = String(b.vendor_id || b.vendorId)
    const existing = await pbFirst<PBRecord>(
      PB_COLLECTIONS.conversations,
      `kind = 'vendor' && customer_id = ${pbQuote(session.user_id)} && vendor_id = ${pbQuote(vendorId)}`
    )
    if (existing) {
      if (b.initial_message || b.initialMessage) {
        await postMessageInternal(existing.id, session, { body: String(b.initial_message || b.initialMessage) })
      }
      return ok({ id: existing.id })
    }
  } else {
    const admin = await pbFirst<PBRecord>(PB_COLLECTIONS.users, `role = 'admin'`, 'created_at')
    adminId = admin ? admin.id : null
  }
  const now = nowIso()
  const created = await pbCreate<PBRecord>(PB_COLLECTIONS.conversations, {
    kind,
    customer_id: session.user_id,
    vendor_id: vendorId,
    admin_id: adminId,
    subject,
    last_message_at: now,
    unread_customer: 0,
    unread_vendor: 0,
    unread_admin: 0,
    created_at: now,
  })
  if (b.initial_message || b.initialMessage) {
    await postMessageInternal(created.id, session, { body: String(b.initial_message || b.initialMessage) })
  }
  return ok({ id: created.id })
})

async function postMessageInternal(
  conversationId: string,
  session: SessionInfo,
  body: { kind?: string; body?: string; media_url?: string | null; media_meta?: unknown }
): Promise<{ error?: Response; message?: Record<string, unknown> }> {
  const conv = await pbFirst<PBRecord>(PB_COLLECTIONS.conversations, `id = ${pbQuote(conversationId)}`)
  if (!conv) return { error: err(404, 'conversation not found') }
  if (!(await canAccessConversation(conv, session))) return { error: err(403, 'forbidden') }
  const kind = ['text', 'image', 'video', 'emoji'].includes(String(body.kind)) ? String(body.kind) : 'text'
  const text = body.body || ''
  let originalLang: string | null = null
  let translations: Record<string, string> | null = null
  if ((kind === 'text' || kind === 'emoji') && text) {
    originalLang = hasCJK(text) ? 'zh' : 'en'
    const tgt = originalLang === 'zh' ? 'en' : 'zh'
    const translated = await translateText(
      text,
      originalLang === 'zh' ? 'chinese' : 'english',
      tgt === 'zh' ? 'chinese' : 'english'
    )
    translations = { [originalLang]: text, [tgt]: translated || text }
  }
  const now = nowIso()
  const created = await pbCreate<PBRecord>(PB_COLLECTIONS.messages, {
    conversation_id: conversationId,
    sender_id: session.user_id,
    sender_role: session.role,
    kind,
    body: text || null,
    media_url: body.media_url || null,
    media_meta_json: body.media_meta ?? null,
    original_lang: originalLang,
    translations_json: translations,
    created_at: now,
  })
  const bump: Record<string, unknown> = { last_message_at: now }
  if (session.user_id !== conv.customer_id) bump.unread_customer = Number(conv.unread_customer || 0) + 1
  if (conv.vendor_id && session.user_id !== conv.vendor_id) bump.unread_vendor = Number(conv.unread_vendor || 0) + 1
  if (session.role !== 'admin' && conv.admin_id) bump.unread_admin = Number(conv.unread_admin || 0) + 1
  await pbUpdate(PB_COLLECTIONS.conversations, conversationId, bump)
  return {
    message: legacyRow(created, { media_meta_json: null, translations_json: null }),
  }
}

route('POST', '/conversations/:id/messages', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const out = await postMessageInternal(params.id, session, b)
  if (out.error) return out.error
  return ok(out as Record<string, unknown>)
})

route('GET', '/conversations/:id/messages', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const conv = await pbFirst<PBRecord>(PB_COLLECTIONS.conversations, `id = ${pbQuote(params.id)}`)
  if (!conv) return err(404, 'not found')
  if (!(await canAccessConversation(conv, session))) return err(403, 'forbidden')
  const url = new URL(req.url)
  const after = url.searchParams.get('after')
  let filter = `conversation_id = ${pbQuote(params.id)}`
  if (after) {
    const anchor = await pbGet<PBRecord>(PB_COLLECTIONS.messages, after).catch(() => null)
    if (anchor?.created_at) {
      filter += ` && created_at > ${pbQuote(String(anchor.created_at))}`
    }
  }
  const messages = await pbListAll<PBRecord>(PB_COLLECTIONS.messages, {
    filter,
    sort: 'created_at',
    perPage: 200,
  })
  return ok({
    conversation: conv,
    messages: messages.slice(0, 200).map((m) => legacyRow(m, { media_meta_json: null, translations_json: null })),
  })
})

route('PATCH', '/conversations/:id/read', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const conv = await pbFirst<PBRecord>(PB_COLLECTIONS.conversations, `id = ${pbQuote(params.id)}`)
  if (!conv) return err(404, 'not found')
  if (!(await canAccessConversation(conv, session))) return err(403, 'forbidden')
  let field: string | null = null
  if (session.role === 'admin') field = 'unread_admin'
  else if (conv.vendor_id === session.user_id) field = 'unread_vendor'
  else if (conv.customer_id === session.user_id) field = 'unread_customer'
  if (field) await pbUpdate(PB_COLLECTIONS.conversations, params.id, { [field]: 0 })
  const unread = await pbListAll<PBRecord>(PB_COLLECTIONS.messages, {
    filter: `conversation_id = ${pbQuote(params.id)} && sender_id != ${pbQuote(session.user_id)}`,
  })
  const now = nowIso()
  for (const m of unread) {
    if (!m.read_at) await pbUpdate(PB_COLLECTIONS.messages, m.id, { read_at: now }).catch(() => null)
  }
  return ok()
})

route('PATCH', '/conversations/:id/typing', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const until = new Date(Date.now() + 5000).toISOString()
  try {
    await pbUpdate(PB_COLLECTIONS.conversations, params.id, {
      typing_user_id: session.user_id,
      typing_until: until,
    })
  } catch {
    /* typing is best-effort */
  }
  return ok()
})

route('GET', '/conversations/:id/poll', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const conv = await pbFirst<PBRecord>(PB_COLLECTIONS.conversations, `id = ${pbQuote(params.id)}`)
  if (!conv) return err(404, 'not found')
  if (!(await canAccessConversation(conv, session))) return err(403, 'forbidden')
  const url = new URL(req.url)
  const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z'
  const deadline = Date.now() + 25000
  let typingInfo: { user_id: string } | null = null
  while (Date.now() < deadline) {
    const messages = await pbListAll<PBRecord>(PB_COLLECTIONS.messages, {
      filter: `conversation_id = ${pbQuote(params.id)} && created_at > ${pbQuote(since)}`,
      sort: 'created_at',
      perPage: 50,
    })
    const fresh = await pbFirst<PBRecord>(PB_COLLECTIONS.conversations, `id = ${pbQuote(params.id)}`)
    if (fresh?.typing_until && new Date(String(fresh.typing_until)).getTime() > Date.now() && fresh.typing_user_id !== session.user_id) {
      typingInfo = { user_id: String(fresh.typing_user_id) }
    }
    if (messages.length) {
      return ok({
        messages: messages.slice(0, 50).map((m) => legacyRow(m, { media_meta_json: null, translations_json: null })),
        typing: typingInfo,
      })
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return ok({ messages: [], typing: typingInfo })
})

route('GET', '/admin/conversations', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const conversations = await pbListAll<PBRecord>(PB_COLLECTIONS.conversations, {
    sort: '-last_message_at,-created_at',
    perPage: 100,
  })
  const users = await pbByIds<UserRecord>(PB_COLLECTIONS.users, conversations.map((c) => String(c.customer_id || '')))
  const rows = conversations.slice(0, 500).map((c) => {
    const u = users.get(String(c.customer_id))
    return {
      ...c,
      customer_first_name: u?.first_name ?? null,
      customer_last_name: u?.last_name ?? null,
      customer_email: u?.email ?? null,
    }
  })
  return ok({ conversations: rows })
})

route('GET', '/vendors/me/conversations', async (req) => {
  const a = await requireAuth(req, ['vendor', 'admin'])
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (!v) return ok({ conversations: [] })
  const conversations = await pbListAll<PBRecord>(PB_COLLECTIONS.conversations, {
    filter: `vendor_id = ${pbQuote(String(v.id))}`,
    sort: '-last_message_at,-created_at',
  })
  const users = await pbByIds<UserRecord>(PB_COLLECTIONS.users, conversations.map((c) => String(c.customer_id || '')))
  const rows = conversations.map((c) => {
    const u = users.get(String(c.customer_id))
    return {
      ...c,
      customer_first_name: u?.first_name ?? null,
      customer_last_name: u?.last_name ?? null,
    }
  })
  return ok({ conversations: rows })
})

// ----- newsletter welcome + broadcast -----
route('POST', '/newsletter/subscribe', async (req) => {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const email = lower(b.email)
  if (!email.includes('@')) return err(400, 'invalid email')
  const existing = await pbFirst<PBRecord>(PB_COLLECTIONS.newsletterSubscribers, `email = ${pbQuote(email)}`)
  if (!existing) {
    await pbCreate(PB_COLLECTIONS.newsletterSubscribers, {
      email,
      source: b.source || 'footer',
      created_at: nowIso(),
    })
  }
  await sendEmail(
    email,
    "You're in 💌",
    brandedEmail(
      'Welcome to the Emporium',
      'Thank you for subscribing! Expect first looks at new wig drops, bundle restocks, and exclusive subscriber-only deals.'
    )
  )
  return ok()
})

route('POST', '/admin/newsletter/broadcast', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const subj = strField(b.subject, 200, { required: true })
  if (subj.error) return err(400, 'subject ' + subj.error)
  const html = strField(b.html, 50000, { required: true })
  if (html.error) return err(400, 'html ' + html.error)
  const subscribers = await pbListAll<PBRecord>(PB_COLLECTIONS.newsletterSubscribers, { fields: 'id,email' })
  let sent = 0
  for (const row of subscribers) {
    if (await sendEmail(String(row.email), String(subj.value), brandedEmail(String(subj.value), String(html.value)))) sent++
  }
  await audit(req, session.user_id, 'newsletter.broadcast', null, null, { count: sent })
  return ok({ sent })
})

// ----- change password -----
route('POST', '/auth/change-password', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!b.currentPassword || !b.newPassword) return err(400, 'currentPassword and newPassword required')
  if (String(b.newPassword).length < 6) return err(400, 'password too short')
  const u = await pbGet<UserRecord>(PB_COLLECTIONS.users, session.user_id).catch(() => null)
  if (!u) return err(404, 'not found')
  const valid = await verifyPassword(
    { hash: u.password_hash, salt: u.password_salt, version: u.password_version },
    u.email,
    String(b.currentPassword)
  )
  if (!valid) return err(401, 'invalid current password')
  const pwd = await createPassword(String(b.newPassword))
  await pbUpdate(PB_COLLECTIONS.users, session.user_id, {
    password_hash: pwd.hash,
    password_salt: pwd.salt,
    password_version: pwd.version,
    updated_at: nowIso(),
  })
  await audit(req, session.user_id, 'auth.password_changed')
  return ok()
})

route('POST', '/auth/reset-password', async (req) => {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const email = lower(b.email)
  const phone = String(b.phone || '').trim()
  const newPassword = String(b.newPassword || '')
  if (!email || !email.includes('@')) return err(400, 'invalid email')
  if (!phone) return err(400, 'phone required')
  if (newPassword.length < 6) return err(400, 'password too short')

  const u = await pbFirst<UserRecord>(PB_COLLECTIONS.users, `email = ${pbQuote(email)}`)
  if (!u) return err(404, 'No account found with that email address.')
  if (digitsOnly(u.phone) !== digitsOnly(phone)) return err(401, 'Phone number does not match this account.')

  const pwd = await createPassword(newPassword)
  await pbUpdate(PB_COLLECTIONS.users, u.id, {
    password_hash: pwd.hash,
    password_salt: pwd.salt,
    password_version: pwd.version,
    updated_at: nowIso(),
  })
  return ok()
})

// ----- wishlist -----
route('GET', '/wishlist', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const items = await pbListAll<PBRecord>(PB_COLLECTIONS.wishlists, {
    filter: `user_id = ${pbQuote(session.user_id)}`,
    sort: '-created_at',
    fields: 'id,slug,created_at',
  })
  return ok({ items })
})
route('POST', '/wishlist', async (req) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!b.slug) return err(400, 'slug required')
  const slug = String(b.slug)
  const existing = await pbFirst<PBRecord>(
    PB_COLLECTIONS.wishlists,
    `user_id = ${pbQuote(session.user_id)} && slug = ${pbQuote(slug)}`
  )
  if (!existing) {
    await pbCreate(PB_COLLECTIONS.wishlists, {
      user_id: session.user_id,
      slug,
      created_at: nowIso(),
    })
  }
  return ok()
})
route('DELETE', '/wishlist/:slug', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const existing = await pbFirst<PBRecord>(
    PB_COLLECTIONS.wishlists,
    `user_id = ${pbQuote(session.user_id)} && slug = ${pbQuote(params.slug)}`
  )
  if (existing) await pbDelete(PB_COLLECTIONS.wishlists, existing.id)
  return ok()
})

// ----- reviews -----
route('GET', '/products/:slug/reviews', async (_req, params) => {
  const reviews = await pbListAll<PBRecord>(PB_COLLECTIONS.productReviews, {
    filter: `product_slug = ${pbQuote(params.slug)} && status = 'approved'`,
    sort: '-created_at',
    fields: 'id,product_slug,user_name,rating,title,body,created_at',
  })
  return ok({ reviews: reviews.slice(0, 200) })
})
route('POST', '/products/:slug/reviews', async (req, params) => {
  const a = await requireAuth(req)
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const rating = Math.max(1, Math.min(5, parseInt(String(b.rating), 10) || 0))
  if (!rating) return err(400, 'rating 1-5 required')
  const body = strField(b.body, 4000, { required: true })
  if (body.error) return err(400, 'body ' + body.error)
  const title = strField(b.title, 200).value
  const u = await pbGet<UserRecord>(PB_COLLECTIONS.users, session.user_id).catch(() => null)
  const userName = `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Anonymous'
  await pbCreate(PB_COLLECTIONS.productReviews, {
    product_slug: params.slug,
    user_id: session.user_id,
    user_name: userName,
    rating,
    title,
    body: body.value,
    status: 'pending',
    created_at: nowIso(),
  })
  return ok()
})
route('PATCH', '/admin/reviews/:id', async (req, params) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!['approved', 'rejected', 'pending'].includes(String(b.status))) return err(400, 'invalid status')
  await pbUpdate(PB_COLLECTIONS.productReviews, params.id, { status: b.status })
  await audit(req, session.user_id, 'review.moderate', 'review', params.id, { status: b.status })
  return ok()
})
route('GET', '/admin/reviews', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const reviews = await pbListAll<PBRecord>(PB_COLLECTIONS.productReviews, { sort: '-created_at', perPage: 100 })
  return ok({ reviews: reviews.slice(0, 500) })
})

// ----- search -----
route('GET', '/search', async (req) => {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const cat = url.searchParams.get('category')
  const min = parseFloat(url.searchParams.get('min') || '')
  const max = parseFloat(url.searchParams.get('max') || '')

  let filter = `active = true && (status = 'approved' || status = 'featured')`
  if (q) filter += ` && (name ~ ${pbQuote(q)} || description ~ ${pbQuote(q)})`
  if (cat) filter += ` && category = ${pbQuote(cat)}`
  if (!isNaN(min)) filter += ` && price >= ${min}`
  if (!isNaN(max)) filter += ` && price <= ${max}`

  const products = await pbListAll<PBRecord>(PB_COLLECTIONS.vendorProducts, {
    filter,
    sort: '-added_at',
    perPage: 100,
  })
  const vendors = await pbByIds<PBRecord>(PB_COLLECTIONS.vendors, products.map((p) => String(p.vendor_id || '')))
  const rows = products.slice(0, 100).map((p) => ({
    ...legacyRow(p, PRODUCT_JSON_SPEC),
    brand_name: vendors.get(String(p.vendor_id))?.brand_name ?? null,
  }))
  return ok({ products: rows })
})

// ----- sales reports -----
route('GET', '/admin/reports/sales', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const url = new URL(req.url)
  const from = url.searchParams.get('from') || '1970-01-01'
  const to = url.searchParams.get('to') || '2999-12-31'
  const fmt = url.searchParams.get('format') || 'json'

  const orders = await pbListAll<PBRecord>(PB_COLLECTIONS.orders, {
    filter: `date >= ${pbQuote(from)} && date <= ${pbQuote(to + 'T23:59:59.999Z')}`,
    fields: 'id,date,grand_total_usd,shipping_usd',
  })
  const grouped = new Map<string, { day: string; orders: number; revenue_usd: number; shipping_usd: number }>()
  for (const o of orders) {
    const day = String(o.date || '').slice(0, 10)
    const entry = grouped.get(day) || { day, orders: 0, revenue_usd: 0, shipping_usd: 0 }
    entry.orders += 1
    entry.revenue_usd += Number(o.grand_total_usd || 0)
    entry.shipping_usd += Number(o.shipping_usd || 0)
    grouped.set(day, entry)
  }
  const results = [...grouped.values()].sort((a, b) => (a.day < b.day ? 1 : -1))

  if (fmt === 'csv') {
    const head = 'day,orders,revenue_usd,shipping_usd\n'
    const rows = results.map((r) => `${r.day},${r.orders},${r.revenue_usd ?? 0},${r.shipping_usd ?? 0}`).join('\n')
    return new Response(head + rows + '\n', {
      status: 200,
      headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="sales.csv"' },
    })
  }
  return ok({ rows: results })
})

// ----- CSV import -----
function parseCSV(text: string) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (!lines.length) return []
  const headers = lines[0].split(',').map((s) => s.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? '').trim()))
    rows.push(obj)
  }
  return rows
}

async function importProductsForVendor(vendorId: string, csv: string) {
  const rows = parseCSV(csv)
  const errors: { row: number; reason: string }[] = []
  let imported = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    try {
      if (!r.name) {
        errors.push({ row: i + 2, reason: 'name required' })
        continue
      }
      if (!r.price) {
        errors.push({ row: i + 2, reason: 'price required' })
        continue
      }
      const wt = parseFloat(r.weightKg || r.weight_kg || '')
      if (!wt || wt <= 0) {
        errors.push({ row: i + 2, reason: 'weightKg > 0 required' })
        continue
      }
      const slug = productSlug(r.name, r.slug, randomToken(3))
      const now = nowIso()
      const images = (r.image_urls || '').split('|').filter(Boolean)
      const videos = (r.video_urls || '').split('|').filter(Boolean)
      await pbCreate(PB_COLLECTIONS.vendorProducts, {
        vendor_id: vendorId,
        slug,
        name: r.name,
        category: r.category || 'beauty',
        price: parseFloat(r.price),
        original_price: r.originalPrice ? parseFloat(r.originalPrice) : null,
        description: r.description || '',
        short_desc: r.short_desc || '',
        features_json: [],
        variants_json: [],
        images_json: images,
        videos_json: videos,
        video: videos[0] || null,
        badge: null,
        whatsapp: null,
        in_stock: true,
        stock_count: r.stock ? parseInt(r.stock, 10) : null,
        weight_kg: wt,
        sensitive: r.sensitive === '1' || r.sensitive === 'true',
        model_3d: null,
        active: true,
        status: 'pending',
        added_at: now,
        updated_at: now,
      })
      imported++
    } catch (e) {
      errors.push({ row: i + 2, reason: e instanceof Error ? e.message : 'unknown' })
    }
  }
  return { imported, errors }
}

route('POST', '/vendors/me/products/import', async (req) => {
  const a = await requireAuth(req, ['vendor', 'admin'])
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const v = await pbFirst<PBRecord>(PB_COLLECTIONS.vendors, `user_id = ${pbQuote(session.user_id)}`)
  if (!v) return err(403, 'not a vendor')
  const text = await req.text()
  const out = await importProductsForVendor(String(v.id), text)
  return ok(out)
})

route('POST', '/admin/products/import', async (req) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const session = a.session as SessionInfo
  const url = new URL(req.url)
  const vendorId = url.searchParams.get('vendor_id')
  if (!vendorId) return err(400, 'vendor_id query param required')
  const text = await req.text()
  const out = await importProductsForVendor(vendorId, text)
  await audit(req, session.user_id, 'products.import', 'vendor', vendorId, out)
  return ok(out)
})

// ----- shipping label PDF -----
function escapePdfText(s: unknown) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
function buildLabelPdf(order: PBRecord, items: PBRecord[]) {
  const customer = ((order.customer_json || {}) as Record<string, unknown>) || {}
  const ship = ((order.shipping_json || {}) as Record<string, unknown>) || {}
  const lines = [
    'TARIES BEAUTY EMPORIUM — SHIPPING LABEL',
    '',
    `Order: ${order.order_id}`,
    `Date: ${order.date || order.created_at}`,
    '',
    'TO:',
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer',
    String(ship.address || customer.address || ''),
    `${ship.city || customer.city || ''}, ${ship.country || customer.country || ''}`,
    `Phone: ${customer.phone || ''}`,
    '',
    `Items: ${items.length}`,
    `Weight: declared`,
    `Total: ${order.currency} ${Number(order.grand_total_usd || 0).toFixed(2)}`,
    '',
    `Barcode: *${order.order_id}*`,
  ]
  let stream = 'BT /F1 12 Tf 50 780 Td 14 TL\n'
  lines.forEach((ln) => {
    stream += `(${escapePdfText(ln)}) Tj T*\n`
  })
  stream += 'ET\n'
  stream += '0 0 0 rg\n'
  const orderStr = String(order.order_id || '')
  for (let i = 0; i < orderStr.length; i++) {
    const x = 50 + i * 8
    const w = (orderStr.charCodeAt(i) % 4) + 1
    stream += `${x} 100 ${w} 50 re f\n`
  }
  const objs: string[] = []
  objs.push('<< /Type /Catalog /Pages 2 0 R >>')
  objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>')
  objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return pdf
}

route('GET', '/admin/orders/:id/label.pdf', async (req, params) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const order = await pbFirst<PBRecord>(PB_COLLECTIONS.orders, `order_id = ${pbQuote(params.id)}`)
  if (!order) return err(404, 'not found')
  const items = await pbListAll<PBRecord>(PB_COLLECTIONS.orderItems, {
    filter: `order_id = ${pbQuote(params.id)}`,
    sort: 'position',
  })
  const pdf = buildLabelPdf(order, items)
  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="label-${params.id}.pdf"`,
    },
  })
})

// ----- health (deep) -----
route('GET', '/health/deep', async () => {
  const checks = { db: false, kv: false, ai: false }
  try {
    await pbList(PB_COLLECTIONS.users, { perPage: 1, fields: 'id' })
    checks.db = true
  } catch {
    /* db down */
  }
  // Rate-limit store is in-process now; report the runtime cache as healthy.
  checks.kv = true
  checks.ai = false
  return ok({ checks, time: nowIso() })
})

// ----- order confirm + vendor notify -----
route('POST', '/orders/:id/confirm', async (_req, params) => {
  const confirmed = await finalizeOrderAfterPayment(params.id)
  if (!confirmed) return err(404, 'not found')
  return ok()
})

route('POST', '/admin/vendors/:id/notify', async (req, params) => {
  const a = await requireAuth(req, 'admin')
  if (a.error) return a.error
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const v = await pbGet<PBRecord>(PB_COLLECTIONS.vendors, params.id).catch(() => null)
  if (!v) return err(404, 'not found')
  const u = await pbGet<UserRecord>(PB_COLLECTIONS.users, String(v.user_id)).catch(() => null)
  if (!u?.email) return err(404, 'not found')
  const subj = b.status === 'approved' ? 'Vendor application approved 🎉' : 'Vendor application update'
  const html =
    b.status === 'approved'
      ? '<p>Congratulations! Your vendor application has been approved. Sign in to your dashboard to start listing products.</p>'
      : `<p>Your vendor application status is now: <strong>${b.status}</strong>.</p>`
  await sendEmail(u.email, subj, brandedEmail(subj, html))
  return ok()
})

// ---------- main entry ----------
export async function handleTariesApi(request: Request): Promise<Response> {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  const rl = await rateLimitGuard(request)
  if (rl) return withCors(rl, origin)
  const csrfRes = csrfGuard(request, request.method)
  if (csrfRes) return withCors(csrfRes, origin)

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'
  for (const r of routes) {
    if (r.method !== request.method) continue
    const m = path.match(r.regex)
    if (!m) continue
    const params: Record<string, string> = {}
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])))
    try {
      const res = await r.handler(request, params)
      return withCors(res, origin)
    } catch (e) {
      const message = e instanceof PocketBaseError || e instanceof Error ? e.message : 'internal error'
      if (message.includes('too large') || (e instanceof PocketBaseError && e.status === 413)) {
        return withCors(err(413, 'Uploaded product data is too large. Please use smaller images and try again.'), origin)
      }
      return withCors(err(500, message), origin)
    }
  }
  return withCors(err(404, 'route not found', { path }), origin)
}
