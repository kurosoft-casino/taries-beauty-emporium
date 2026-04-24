import { normalizeEmail } from './validation'

export interface VendorProfile {
  id: string
  businessName: string
  ownerName: string
  email: string
  phone: string
  category: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  appliedAt: string
  feeStatus: 'unpaid' | 'paid'
  whatsapp?: string
}

const VENDORS_KEY = 'taries-vendors'
const VENDOR_SESSION_KEY = 'taries-vendor-session'

export function getAllVendorProfiles(): VendorProfile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(VENDORS_KEY)
    return raw ? JSON.parse(raw) as VendorProfile[] : []
  } catch {
    return []
  }
}

export function findVendorProfileByEmail(email: string): VendorProfile | null {
  const normalizedEmail = normalizeEmail(email)
  return getAllVendorProfiles().find(vendor => vendor.email.toLowerCase() === normalizedEmail) ?? null
}

export function saveVendorProfiles(vendors: VendorProfile[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors))
}

export function getVendorSession(): VendorProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(VENDOR_SESSION_KEY)
    return raw ? JSON.parse(raw) as VendorProfile : null
  } catch {
    return null
  }
}

export function writeVendorSession(vendor: VendorProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(vendor))
}

export function clearVendorSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(VENDOR_SESSION_KEY)
}
