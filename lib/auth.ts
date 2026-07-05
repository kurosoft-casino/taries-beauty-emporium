import { hashSecret, randomSalt } from './security'
import { readJSON, removeKey, writeJSON } from './storage'
import { isValidEmail, normalizeEmail, sanitizeDigits, sanitizeInlineText, sanitizePhone } from './validation'
import type { SupportedCountry } from './phoneCountries'
import { withApiBase } from './site'

export type AdminLevel = 'super-admin' | 'staff-admin' | 'support-admin' | 'finance-admin'

export interface SavedAddress {
  id: string
  label: string
  firstName: string
  lastName: string
  address: string
  city: string
  country: SupportedCountry
  phone: string
  isDefault: boolean
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role?: 'admin'
  adminLevel?: AdminLevel
  country: SupportedCountry
  phone: string
  passwordHash: string
  passwordSalt?: string
  passwordVersion?: 1 | 2
  createdAt: string
  avatar?: string
  addresses: SavedAddress[]
}

interface SessionMeta {
  userId: string
  lastSeen: number
}

interface RegisterUserData {
  firstName: string
  lastName: string
  email: string
  country: SupportedCountry
  phone: string
  password: string
  avatar?: string
}

const USERS_KEY = 'taries-users'
const SESSION_KEY = 'taries-session'
const SESSION_META_KEY = 'taries-session-meta'
const API_SESSION_TOKEN_KEY = 'taries-api-session-token'
const AUTH_STATE_EVENT = 'taries-auth-state-changed'
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000
export const ADMIN_EMAILS = ['tarimoboere18@gmail.com'] as const
const REMOTE_AUTH_TIMEOUT_MS = 8000

export function isAdminEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  return ADMIN_EMAILS.includes(normalized as (typeof ADMIN_EMAILS)[number])
}

export function isAdminUser(user: Pick<User, 'email' | 'role' | 'adminLevel'> | null | undefined): boolean {
  if (!user) return false
  return user.role === 'admin' || !!user.adminLevel || isAdminEmail(user.email)
}

export function getAdminLevel(user: Pick<User, 'email' | 'role' | 'adminLevel'> | null | undefined): AdminLevel | null {
  if (!user) return null
  if (user.adminLevel) return user.adminLevel
  return isAdminEmail(user.email) || user.role === 'admin' ? 'super-admin' : null
}

function applyUserRole(user: User): User {
  if (isAdminEmail(user.email)) {
    return { ...user, role: 'admin', adminLevel: user.adminLevel ?? 'super-admin' }
  }

  if (user.adminLevel) {
    return { ...user, role: 'admin' }
  }

  return user.role
    ? { ...user, role: undefined, adminLevel: undefined }
    : user
}

function legacyHashPassword(email: string, password: string): string {
  return btoa(`${email}:${password}`)
}

async function createPasswordHash(email: string, password: string, salt: string): Promise<string> {
  return hashSecret(`${normalizeEmail(email)}::${password}`, salt)
}

function getUsers(): User[] {
  const stored = readJSON<User[]>(USERS_KEY, [])
  const normalized = stored.map(applyUserRole)
  if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
    writeJSON(USERS_KEY, normalized)
  }
  return normalized
}

function saveUsers(users: User[]): void {
  if (!writeJSON(USERS_KEY, users.map(applyUserRole))) {
    throw new Error('Could not save your account data on this device. Please free some browser storage and try again.')
  }
}

function writeSession(user: User): void {
  const sessionUser = applyUserRole(user)
  const sessionMeta: SessionMeta = { userId: user.id, lastSeen: Date.now() }
  if (!writeJSON(SESSION_KEY, sessionUser) || !writeJSON(SESSION_META_KEY, sessionMeta)) {
    throw new Error('Could not start your session on this device. Please allow browser storage and try again.')
  }
  notifyAuthStateChanged()
}

function readSessionMeta(): SessionMeta | null {
  return readJSON<SessionMeta | null>(SESSION_META_KEY, null)
}

function readApiSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem(API_SESSION_TOKEN_KEY)
    return token && token.trim() ? token.trim() : null
  } catch {
    return null
  }
}

function writeApiSessionToken(token: string | null | undefined): void {
  if (typeof window === 'undefined') return
  try {
    if (token && token.trim()) localStorage.setItem(API_SESSION_TOKEN_KEY, token.trim())
    else localStorage.removeItem(API_SESSION_TOKEN_KEY)
  } catch {
    // ignore storage write errors
  }
}

function notifyAuthStateChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_STATE_EVENT))
}

export function subscribeAuthStateChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(AUTH_STATE_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(AUTH_STATE_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

interface RemoteAuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  country?: SupportedCountry | string
  phone?: string
  createdAt?: string
  avatar?: string
  role?: 'admin'
}

interface RemoteAuthPayload {
  ok: boolean
  user: RemoteAuthUser | null
  sessionToken?: string
}

function asSupportedCountry(value: string | undefined): SupportedCountry {
  if (value === 'Nigeria' || value === 'Ghana' || value === 'China') return value
  return 'Other'
}

function mapRemoteUserToLocal(user: RemoteAuthUser): User {
  return applyUserRole({
    id: user.id,
    firstName: sanitizeInlineText(user.firstName),
    lastName: sanitizeInlineText(user.lastName),
    email: normalizeEmail(user.email),
    role: user.role === 'admin' ? 'admin' : undefined,
    adminLevel: user.role === 'admin' ? 'super-admin' : undefined,
    country: asSupportedCountry(typeof user.country === 'string' ? user.country : undefined),
    phone: sanitizePhone(user.phone ?? ''),
    passwordHash: 'remote-auth',
    passwordSalt: undefined,
    passwordVersion: 2,
    createdAt: user.createdAt ?? new Date().toISOString(),
    avatar: user.avatar,
    addresses: [],
  })
}

function upsertLocalUser(user: User): void {
  const users = getUsers()
  const idx = users.findIndex(entry => entry.id === user.id || entry.email.toLowerCase() === user.email.toLowerCase())
  const next = [...users]
  if (idx >= 0) next[idx] = { ...next[idx], ...user, addresses: next[idx].addresses ?? [] }
  else next.push(user)
  saveUsers(next)
}

async function requestRemoteAuth<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REMOTE_AUTH_TIMEOUT_MS)
  try {
    const headers = new Headers(init?.headers ?? {})
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    const apiSessionToken = readApiSessionToken()
    if (apiSessionToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${apiSessionToken}`)
    }
    const response = await fetch(withApiBase(path), {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      signal: controller.signal,
      headers,
    })
    const payload = await response.json().catch(() => null) as T | { error?: string } | null
    if (!response.ok) {
      if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
        throw new Error(payload.error)
      }
      throw new Error('Request failed. Please try again.')
    }
    if (!payload) throw new Error('Invalid response from server. Please try again.')
    return payload as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    if (error instanceof Error) throw error
    throw new Error('Network error. Please try again.')
  } finally {
    window.clearTimeout(timeout)
  }
}

async function verifyPassword(user: User, password: string): Promise<boolean> {
  if (user.passwordVersion === 2 && user.passwordSalt) {
    const hash = await createPasswordHash(user.email, password, user.passwordSalt)
    return user.passwordHash === hash
  }
  const expectedHash1 = legacyHashPassword(normalizeEmail(user.email), password)
  const expectedHash2 = legacyHashPassword(user.email, password)
  return user.passwordHash === expectedHash1 || user.passwordHash === expectedHash2
}

async function upgradeLegacyPassword(user: User, password: string): Promise<User> {
  const salt = randomSalt()
  const upgraded: User = {
    ...user,
    passwordHash: await createPasswordHash(user.email, password, salt),
    passwordSalt: salt,
    passwordVersion: 2,
  }
  const users = getUsers().map(entry => (entry.id === upgraded.id ? upgraded : entry))
  saveUsers(users)
  return upgraded
}

export function touchSession(): void {
  if (typeof window === 'undefined') return
  const current = readJSON<User | null>(SESSION_KEY, null)
  if (!current) return
  writeJSON(SESSION_META_KEY, { userId: current.id, lastSeen: Date.now() } satisfies SessionMeta)
}

export async function syncSessionFromServer(): Promise<User | null> {
  if (typeof window === 'undefined') return null
  try {
    const payload = await requestRemoteAuth<RemoteAuthPayload>('/auth/me')
    writeApiSessionToken(payload.sessionToken)
    if (!payload.user) return null
    const mapped = mapRemoteUserToLocal(payload.user)
    upsertLocalUser(mapped)
    writeSession(mapped)
    return mapped
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Failed to sync session from server: ${error.message}`)
    } else {
      console.warn('Failed to sync session from server.')
    }
    return null
  }
}

export async function registerUser(data: RegisterUserData): Promise<User> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const firstName = sanitizeInlineText(data.firstName)
  const lastName = sanitizeInlineText(data.lastName)
  const email = normalizeEmail(data.email)
  const country = data.country
  const phone = sanitizePhone(data.phone)
  const password = data.password

  if (!firstName) throw new Error('First name is required.')
  if (!lastName) throw new Error('Last name is required.')
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.')
  if (!country) throw new Error('Country is required.')
  if (!phone) throw new Error('Phone number is required.')
  if (password.length < 8) throw new Error('Password must be at least 8 characters.')

  const remote = await requestRemoteAuth<RemoteAuthPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, country, phone, password, avatar: data.avatar }),
  })
  if (!remote.user) throw new Error('Registration service returned an invalid response.')
  writeApiSessionToken(remote.sessionToken)
  const mapped = mapRemoteUserToLocal(remote.user)
  upsertLocalUser(mapped)
  writeSession(mapped)
  return mapped
}

export async function loginUser(emailInput: string, password: string): Promise<User> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.')

  const remote = await requestRemoteAuth<RemoteAuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!remote.user) throw new Error('Login service returned an invalid response.')
  writeApiSessionToken(remote.sessionToken)
  const mapped = mapRemoteUserToLocal(remote.user)
  upsertLocalUser(mapped)
  writeSession(mapped)
  return mapped
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return
  const apiSessionToken = readApiSessionToken()
  const headers = apiSessionToken ? { Authorization: `Bearer ${apiSessionToken}` } : undefined
  void fetch(withApiBase('/auth/logout'), { method: 'POST', credentials: 'include', headers }).catch(() => undefined)
  removeKey(SESSION_KEY)
  removeKey(SESSION_META_KEY)
  writeApiSessionToken(null)
  notifyAuthStateChanged()
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  const session = readJSON<User | null>(SESSION_KEY, null)
  if (!session) return null
  const current = applyUserRole(session)
  if (
    current.role !== session.role ||
    current.adminLevel !== session.adminLevel ||
    current.country !== session.country
  ) {
    writeJSON(SESSION_KEY, current)
  }

  const meta = readSessionMeta()
  if (!meta || meta.userId !== current.id) {
    writeJSON(SESSION_META_KEY, { userId: current.id, lastSeen: Date.now() } satisfies SessionMeta)
    return current
  }

  if (Date.now() - meta.lastSeen > SESSION_TIMEOUT_MS) {
    logoutUser()
    return null
  }

  return current
}

export async function updateUser(
  fields: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatar'>>,
): Promise<User> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')

  const payload = await requestRemoteAuth<RemoteAuthPayload>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({
      ...(fields.firstName !== undefined ? { firstName: sanitizeInlineText(fields.firstName) } : {}),
      ...(fields.lastName !== undefined ? { lastName: sanitizeInlineText(fields.lastName) } : {}),
      ...(fields.phone !== undefined ? { phone: sanitizePhone(fields.phone) } : {}),
      ...(fields.avatar !== undefined ? { avatar: fields.avatar } : {}),
    }),
  })
  if (!payload.user) throw new Error('Profile service returned an invalid response.')
  const mapped = mapRemoteUserToLocal(payload.user)
  upsertLocalUser(mapped)
  writeSession(mapped)
  return mapped
}

export function addAddress(addr: Omit<SavedAddress, 'id'>): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')

  const newAddress: SavedAddress = {
    ...addr,
    id: `addr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: sanitizeInlineText(addr.label),
    firstName: sanitizeInlineText(addr.firstName),
    lastName: sanitizeInlineText(addr.lastName),
    address: sanitizeInlineText(addr.address),
    city: sanitizeInlineText(addr.city),
    phone: sanitizePhone(addr.phone),
  }

  let addresses = addr.isDefault ? current.addresses.map(item => ({ ...item, isDefault: false })) : current.addresses
  addresses = [...addresses, newAddress]
  const updated = { ...current, addresses }
  saveUsers(getUsers().map(user => (user.id === updated.id ? updated : user)))
  writeSession(updated)
  return updated
}

export function removeAddress(id: string): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const updated = { ...current, addresses: current.addresses.filter(address => address.id !== id) }
  saveUsers(getUsers().map(user => (user.id === updated.id ? updated : user)))
  writeSession(updated)
  return updated
}

export function setDefaultAddress(id: string): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const updated = {
    ...current,
    addresses: current.addresses.map(address => ({ ...address, isDefault: address.id === id })),
  }
  saveUsers(getUsers().map(user => (user.id === updated.id ? updated : user)))
  writeSession(updated)
  return updated
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.')
  await requestRemoteAuth('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function resetPasswordWithEmail(emailInput: string, phoneInput: string, newPassword: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const email = normalizeEmail(emailInput)
  const phone = sanitizePhone(phoneInput)
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.')
  if (!phone) throw new Error('Phone number is required.')
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.')
  await requestRemoteAuth('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, phone, newPassword }),
  })
}

export function deleteAccount(): void {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  saveUsers(getUsers().filter(user => user.id !== current.id))
  logoutUser()
}
