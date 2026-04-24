import { hashSecret, randomSalt } from './security'
import { readJSON, removeKey, writeJSON } from './storage'
import { isValidEmail, normalizeEmail, sanitizeDigits, sanitizeInlineText, sanitizePhone } from './validation'
import type { SupportedCountry } from './phoneCountries'

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
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000
export const ADMIN_EMAILS = ['tarimoboere18@gmail.com', 'kurosoft01@gmail.com'] as const

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
}

function readSessionMeta(): SessionMeta | null {
  return readJSON<SessionMeta | null>(SESSION_META_KEY, null)
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

  const users = getUsers()
  const existing = users.find(user => user.email.toLowerCase() === email)
  if (existing) throw new Error('An account with this email already exists.')

  const salt = randomSalt()
  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    firstName,
    lastName,
    email,
    role: isAdminEmail(email) ? 'admin' : undefined,
    adminLevel: isAdminEmail(email) ? 'super-admin' : undefined,
    country,
    phone,
    passwordHash: await createPasswordHash(email, password, salt),
    passwordSalt: salt,
    passwordVersion: 2,
    createdAt: new Date().toISOString(),
    avatar: data.avatar,
    addresses: [],
  }

  saveUsers([...users, newUser])
  writeSession(newUser)
  return newUser
}

export async function loginUser(emailInput: string, password: string): Promise<User> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.')

  const users = getUsers()
  const found = users.find(user => user.email.toLowerCase() === email)
  if (!found) throw new Error('No account found with that email address.')

  const verified = await verifyPassword(found, password)
  if (!verified) throw new Error('Incorrect password. Please try again.')

  const user = found.passwordVersion === 2 ? found : await upgradeLegacyPassword(found, password)
  writeSession(user)
  return user
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return
  removeKey(SESSION_KEY)
  removeKey(SESSION_META_KEY)
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

export function updateUser(
  fields: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatar'>>,
): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')

  const updated: User = {
    ...current,
    ...(fields.firstName !== undefined ? { firstName: sanitizeInlineText(fields.firstName) } : {}),
    ...(fields.lastName !== undefined ? { lastName: sanitizeInlineText(fields.lastName) } : {}),
    ...(fields.phone !== undefined ? { phone: sanitizePhone(fields.phone) } : {}),
    ...(fields.avatar !== undefined ? { avatar: fields.avatar } : {}),
  }

  const users = getUsers().map(user => (user.id === updated.id ? updated : user))
  saveUsers(users)
  writeSession(updated)
  return updated
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
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.')

  const verified = await verifyPassword(current, currentPassword)
  if (!verified) throw new Error('Current password is incorrect.')

  const salt = randomSalt()
  const updated: User = {
    ...current,
    passwordHash: await createPasswordHash(current.email, newPassword, salt),
    passwordSalt: salt,
    passwordVersion: 2,
  }

  saveUsers(getUsers().map(user => (user.id === updated.id ? updated : user)))
  writeSession(updated)
}

export async function resetPasswordWithEmail(emailInput: string, phoneInput: string, newPassword: string): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const email = normalizeEmail(emailInput)
  const phone = sanitizePhone(phoneInput)
  if (!isValidEmail(email)) throw new Error('Please enter a valid email address.')
  if (!phone) throw new Error('Phone number is required.')
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.')

  const users = getUsers()
  const found = users.find(user => user.email.toLowerCase() === email)
  if (!found) throw new Error('No account found with that email address.')

  if (sanitizeDigits(found.phone) !== sanitizeDigits(phone)) {
    throw new Error('Phone number does not match this account.')
  }

  const salt = randomSalt()
  const updated: User = {
    ...found,
    passwordHash: await createPasswordHash(found.email, newPassword, salt),
    passwordSalt: salt,
    passwordVersion: 2,
  }

  saveUsers(users.map(user => (user.id === updated.id ? updated : user)))
}

export function deleteAccount(): void {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  saveUsers(getUsers().filter(user => user.id !== current.id))
  logoutUser()
}
