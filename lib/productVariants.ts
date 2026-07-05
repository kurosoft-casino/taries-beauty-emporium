export interface ProductVariantOption {
  value: string
  price?: number
}

export interface ProductVariant {
  label: string
  options: Array<string | ProductVariantOption>
}

function normalizePrice(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
}

export function normalizeVariantOption(option: unknown): ProductVariantOption | null {
  if (typeof option === 'string') {
    const value = option.trim()
    return value ? { value } : null
  }

  if (typeof option !== 'object' || option === null) return null

  const rawValue = 'value' in option ? option.value : 'label' in option ? option.label : ''
  const value = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!value) return null

  return {
    value,
    price: 'price' in option ? normalizePrice(option.price) : undefined,
  }
}

export function normalizeVariantList(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is { label?: unknown; options?: unknown } => typeof entry === 'object' && entry !== null)
    .map(entry => ({
      label: typeof entry.label === 'string' ? entry.label.trim() : '',
      options: Array.isArray(entry.options)
        ? entry.options.map(normalizeVariantOption).filter((option): option is ProductVariantOption => Boolean(option))
        : [],
    }))
    .filter(entry => entry.label && entry.options.length > 0)
}

export function parseVariantList(value: string | null | undefined): ProductVariant[] {
  if (!value) return []
  try {
    return normalizeVariantList(JSON.parse(value))
  } catch {
    return []
  }
}

export function getVariantOptionLabel(option: string | ProductVariantOption): string {
  return normalizeVariantOption(option)?.value ?? ''
}

export function getVariantOptionPrice(option: string | ProductVariantOption): number | undefined {
  return normalizeVariantOption(option)?.price
}

export function getSelectedVariantPrice(
  variants: ProductVariant[] | undefined,
  selectedVariants: Record<string, string>,
): number | undefined {
  if (!variants?.length) return undefined

  let matchedPrice: number | undefined

  for (const variant of variants) {
    const selectedValue = selectedVariants[variant.label]
    if (!selectedValue) continue

    const normalizedOptions = variant.options
      .map(normalizeVariantOption)
      .filter((entry): entry is ProductVariantOption => Boolean(entry))

    const option = normalizedOptions.find(entry => entry.value === selectedValue)

    if (option?.price) matchedPrice = option.price
  }

  return matchedPrice
}
