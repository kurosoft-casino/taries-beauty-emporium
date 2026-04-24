// SSR-safe localStorage helpers for vendor products and admin overrides

export interface VendorProduct {
  id: string
  vendorEmail: string
  name: string
  category: string
  price: number
  originalPrice?: number
  images: string[]       // URLs or base64 data URIs
  video?: string         // YouTube URL
  description: string
  shortDesc?: string
  features: string[]
  variants?: { label: string; options: string[] }[]
  inStock: boolean
  stockCount?: number
  whatsapp: string
  badge?: 'new' | 'sale' | 'hot' | 'bestseller' | ''
  addedAt: string
  active: boolean
  status?: 'pending' | 'approved' | 'featured' | 'removed'
}

// Admin can override any catalogue product field via localStorage
export interface ProductOverride {
  slug: string
  name?: string
  price?: number
  originalPrice?: number
  inStock?: boolean
  badge?: 'new' | 'sale' | 'hot' | 'bestseller' | ''
  images?: string[]
  description?: string
  shortDesc?: string
}

function vendorKey(email: string) {
  return `taries-vendor-${email}-products`
}

export function getVendorProducts(email: string): VendorProduct[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(vendorKey(email))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveVendorProducts(email: string, products: VendorProduct[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(vendorKey(email), JSON.stringify(products))
  } catch {}
}

export function addVendorProduct(
  email: string,
  data: Omit<VendorProduct, 'id' | 'vendorEmail' | 'addedAt'>,
): VendorProduct {
  const product: VendorProduct = {
    ...data,
    id: 'vp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    vendorEmail: email,
    addedAt: new Date().toISOString(),
  }
  const existing = getVendorProducts(email)
  saveVendorProducts(email, [...existing, product])
  return product
}

export function updateVendorProduct(
  email: string,
  id: string,
  updates: Partial<VendorProduct>,
): void {
  const products = getVendorProducts(email)
  const updated = products.map(p => (p.id === id ? { ...p, ...updates } : p))
  saveVendorProducts(email, updated)
}

export function deleteVendorProduct(email: string, id: string): void {
  const products = getVendorProducts(email)
  saveVendorProducts(email, products.filter(p => p.id !== id))
}

export function getAllVendorProducts(): VendorProduct[] {
  if (typeof window === 'undefined') return []
  const all: VendorProduct[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && /^taries-vendor-.+-products$/.test(key)) {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const products: VendorProduct[] = JSON.parse(raw)
            all.push(...products)
          }
        } catch {}
      }
    }
  } catch {}
  return all
}

const OVERRIDES_KEY = 'taries-product-overrides'

export function getProductOverrides(): Record<string, ProductOverride> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveProductOverride(override: ProductOverride): void {
  if (typeof window === 'undefined') return
  try {
    const overrides = getProductOverrides()
    overrides[override.slug] = override
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {}
}

export function clearProductOverride(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    const overrides = getProductOverrides()
    delete overrides[slug]
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {}
}
