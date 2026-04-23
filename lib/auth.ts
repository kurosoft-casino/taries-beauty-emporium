export interface SavedAddress {
  id: string
  label: string
  firstName: string
  lastName: string
  address: string
  city: string
  country: 'Nigeria' | 'Ghana' | 'China' | 'Other'
  phone: string
  isDefault: boolean
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  passwordHash: string
  createdAt: string
  avatar?: string
  addresses: SavedAddress[]
}

const USERS_KEY = 'taries-users'
const SESSION_KEY = 'taries-session'

function hashPassword(email: string, password: string): string {
  return btoa(email + ':' + password)
}

function getUsers(): User[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // quota exceeded
  }
}

export function registerUser(
  data: Omit<User, 'id' | 'createdAt' | 'addresses'>
): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const users = getUsers()
  const existing = users.find(u => u.email.toLowerCase() === data.email.toLowerCase())
  if (existing) throw new Error('An account with this email already exists.')
  const newUser: User = {
    ...data,
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    addresses: [],
  }
  saveUsers([...users, newUser])
  return newUser
}

export function loginUser(email: string, password: string): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const users = getUsers()
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
  if (!user) throw new Error('No account found with that email address.')
  const hash = hashPassword(email.toLowerCase(), password)
  // Also check with original email casing stored
  const hashAlt = hashPassword(user.email, password)
  if (user.passwordHash !== hash && user.passwordHash !== hashAlt) {
    throw new Error('Incorrect password. Please try again.')
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
  return user
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function updateUser(
  fields: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatar'>>
): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const updated = { ...current, ...fields }
  const users = getUsers()
  const newUsers = users.map(u => u.id === updated.id ? updated : u)
  saveUsers(newUsers)
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function addAddress(addr: Omit<SavedAddress, 'id'>): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const newAddr: SavedAddress = {
    ...addr,
    id: `addr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  }
  let addresses = addr.isDefault
    ? current.addresses.map(a => ({ ...a, isDefault: false }))
    : current.addresses
  addresses = [...addresses, newAddr]
  const updated = { ...current, addresses }
  const users = getUsers()
  saveUsers(users.map(u => u.id === updated.id ? updated : u))
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function removeAddress(id: string): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const updated = { ...current, addresses: current.addresses.filter(a => a.id !== id) }
  const users = getUsers()
  saveUsers(users.map(u => u.id === updated.id ? updated : u))
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function setDefaultAddress(id: string): User {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const updated = {
    ...current,
    addresses: current.addresses.map(a => ({ ...a, isDefault: a.id === id })),
  }
  const users = getUsers()
  saveUsers(users.map(u => u.id === updated.id ? updated : u))
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function changePassword(currentPassword: string, newPassword: string): void {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const expectedHash1 = hashPassword(current.email.toLowerCase(), currentPassword)
  const expectedHash2 = hashPassword(current.email, currentPassword)
  if (current.passwordHash !== expectedHash1 && current.passwordHash !== expectedHash2) {
    throw new Error('Current password is incorrect.')
  }
  const newHash = hashPassword(current.email, newPassword)
  const updated = { ...current, passwordHash: newHash }
  const users = getUsers()
  saveUsers(users.map(u => u.id === updated.id ? updated : u))
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function deleteAccount(): void {
  if (typeof window === 'undefined') throw new Error('Not available on server')
  const current = getCurrentUser()
  if (!current) throw new Error('Not logged in.')
  const users = getUsers()
  saveUsers(users.filter(u => u.id !== current.id))
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
