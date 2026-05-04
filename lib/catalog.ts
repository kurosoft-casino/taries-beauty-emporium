import { products as baseProducts, type Product, type Category } from './products'
import { getAllVendorProducts, getProductOverrides, type ProductOverride, type VendorProduct } from './productStore'

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
