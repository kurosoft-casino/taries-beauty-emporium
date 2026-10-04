import { products as baseProducts, type Product, type Category } from './products'
import { getAllVendorProducts, getProductOverrides, type ProductOverride, type VendorProduct } from './productStore'
import type { ProductVariant } from './productVariants'

export interface StorefrontProduct extends Product {
  source: 'catalog' | 'vendor'
  vendorEmail?: string
  contactWhatsApp?: string
}

const vendorCategoryMap: Record<string, { category: Category; label: string }> = {
  'hair & wigs': { category: 'wigs', label: 'Human Hair Wigs' },
  'bundles & weaves': { category: 'bundles', label: 'Hair Bundles' },
  'custom wigs': { category: 'custom-wigs', label: 'Custom Made Wigs' },
  'hair maintenance': { category: 'maintenance', label: 'Hair Maintenance' },
  'beauty & cosmetics': { category: 'beauty', label: 'Beauty Products' },
  'clothing & fashion': { category: 'coats', label: 'Female Coats' },
  electronics: { category: 'electronics', label: 'Electronics' },
  accessories: { category: 'beauty', label: 'Beauty Products' },
  kitchenware: { category: 'kitchenware', label: 'Kitchenware' },
  bedding: { category: 'bedding', label: 'Bedding' },
  cleaning: { category: 'cleaning', label: 'Cleaning Essentials' },
  other: { category: 'beauty', label: 'Beauty Products' },
}

function applyOverride(product: Product, override?: ProductOverride): StorefrontProduct {
  const merged = {
    ...product,
    ...override,
  }

  return {
    ...merged,
    badge: override?.badge || product.badge,
    source: 'catalog',
  }
}

function mapVendorCategory(category: string) {
  return vendorCategoryMap[category.trim().toLowerCase()] ?? { category: 'beauty' as const, label: category || 'Vendor Product' }
}

function toVendorStorefrontProduct(product: VendorProduct): StorefrontProduct {
  const mapped = mapVendorCategory(product.category)
  return {
    id: product.id,
    name: product.name,
    slug: `vendor-${product.id}`,
    category: mapped.category,
    categoryLabel: mapped.label,
    price: product.price,
    originalPrice: product.originalPrice,
    images: product.images.length > 0 ? product.images : [baseProducts[0].images[0]],
    video: product.video,
    badge: product.badge || undefined,
    description: product.description,
    shortDesc: product.shortDesc || product.description.slice(0, 120),
    features: product.features.length > 0 ? product.features : ['Vendor marketplace product', 'Contact vendor directly for custom requests'],
    variants: product.variants,
    inStock: product.inStock,
    stockCount: product.stockCount,
    weightKg: 1,
    rating: 5,
    reviews: 0,
    shipsFrom: 'Guangzhou, China',
    deliveryDays: '7–14 business days',
    tags: [
      product.category,
      product.name,
      ...(product.features ?? []),
    ].map(tag => tag.toLowerCase()),
    source: 'vendor',
    vendorEmail: product.vendorEmail,
    contactWhatsApp: product.whatsapp,
  }
}

function isVisibleVendorProduct(product: VendorProduct & { status?: string }): boolean {
  if (!product.active) return false
  if (!product.status) return true
  return product.status === 'approved' || product.status === 'featured'
}

export function getStorefrontProducts(): StorefrontProduct[] {
  const overrides = getProductOverrides()
  const catalogProducts = baseProducts.map(product => applyOverride(product, overrides[product.slug]))
  if (typeof window === 'undefined') return catalogProducts
  const vendorProducts = getAllVendorProducts()
    .filter(product => isVisibleVendorProduct(product))
    .map(product => toVendorStorefrontProduct(product))
  return [...catalogProducts, ...vendorProducts]
}

export function getCatalogProductBySlug(slug: string): StorefrontProduct | undefined {
  return getStorefrontProducts().find(product => product.slug === slug)
}

export function getVendorProductById(id: string): StorefrontProduct | undefined {
  return getStorefrontProducts().find(product => product.source === 'vendor' && product.id === id)
}

export function getProductHref(product: Pick<StorefrontProduct, 'source' | 'slug' | 'id'>): string {
  return product.source === 'vendor'
    ? `/product-preview?id=${encodeURIComponent(product.id)}`
    : `/product/${product.slug}`
}

// ---------- remote (API-backed) catalog merge ----------

export interface RemoteProductRow {
  id: string
  vendor_id?: string | null
  slug: string
  name: string
  category?: string | null
  price: number
  original_price?: number | null
  description?: string | null
  short_desc?: string | null
  features_json?: string | null
  variants_json?: string | null
  images_json?: string | null
  videos_json?: string | null
  video?: string | null
  badge?: string | null
  whatsapp?: string | null
  in_stock?: boolean | number | null
  stock_count?: number | null
  weight_kg?: number | null
  sensitive?: boolean | null
  model_3d?: string | null
  active?: boolean | number | null
  status?: string | null
  added_at?: string | null
  vendor_email?: string | null
  vendor_whatsapp?: string | null
  brand_name?: string | null
}

export interface RemoteOverrideRow {
  slug: string
  name?: string | null
  price?: number | null
  original_price?: number | null
  in_stock?: boolean | number | null
  badge?: string | null
  images_json?: string | null
  description?: string | null
  short_desc?: string | null
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function mapRemoteProductRow(row: RemoteProductRow): StorefrontProduct {
  const vendorProduct: VendorProduct = {
    id: row.id,
    vendorEmail: row.vendor_email ?? '',
    name: row.name,
    category: row.category ?? 'beauty',
    price: Number(row.price || 0),
    originalPrice: row.original_price ?? undefined,
    images: parseJsonArray<string>(row.images_json),
    video: row.video ?? undefined,
    description: row.description ?? '',
    shortDesc: row.short_desc ?? undefined,
    features: parseJsonArray<string>(row.features_json),
    variants: parseJsonArray<ProductVariant>(row.variants_json),
    inStock: row.in_stock === 0 ? false : Boolean(row.in_stock ?? true),
    stockCount: row.stock_count ?? undefined,
    whatsapp: row.vendor_whatsapp ?? row.whatsapp ?? '',
    badge: (row.badge as VendorProduct['badge']) ?? '',
    addedAt: row.added_at ?? new Date().toISOString(),
    active: row.active === 0 ? false : Boolean(row.active ?? true),
    status: (row.status as VendorProduct['status']) ?? 'approved',
  }
  return toVendorStorefrontProduct(vendorProduct)
}

export function mapRemoteOverrideRow(row: RemoteOverrideRow): ProductOverride {
  return {
    slug: row.slug,
    name: row.name ?? undefined,
    price: row.price ?? undefined,
    originalPrice: row.original_price ?? undefined,
    inStock: row.in_stock === 0 ? false : row.in_stock == null ? undefined : Boolean(row.in_stock),
    badge: (row.badge as ProductOverride['badge']) ?? undefined,
    images: row.images_json ? parseJsonArray<string>(row.images_json) : undefined,
    description: row.description ?? undefined,
    shortDesc: row.short_desc ?? undefined,
  }
}

export function mergeStorefrontProducts(
  remoteProducts: StorefrontProduct[],
  remoteOverrides: Record<string, ProductOverride>,
): StorefrontProduct[] {
  const effectiveOverrides = { ...getProductOverrides(), ...remoteOverrides }
  const catalogProducts = baseProducts.map(product => applyOverride(product, effectiveOverrides[product.slug]))
  if (typeof window === 'undefined') return catalogProducts
  const remoteIds = new Set(remoteProducts.map(product => product.id))
  const localVendorProducts = getAllVendorProducts()
    .filter(product => isVisibleVendorProduct(product))
    .map(product => toVendorStorefrontProduct(product))
    .filter(product => !remoteIds.has(product.id))
  return [...catalogProducts, ...remoteProducts, ...localVendorProducts]
}
