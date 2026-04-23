/**
 * Bundle deals — shown on product pages and a dedicated bundles section.
 * Each bundle pairs a main product with companion products + a saving.
 */

export interface Bundle {
  id: string
  name: string
  description: string
  productSlugs: string[]   // first is the "hero" product
  savingUsd: number        // how much cheaper vs buying separately
  badge?: string
}

export const bundles: Bundle[] = [
  {
    id: 'starter-glam',
    name: 'Starter Glam Bundle',
    description: 'Brazilian straight wig + our bestselling wig care kit — everything you need to look and maintain your best.',
    productSlugs: ['brazilian-straight-hd-lace-front', 'wig-maintenance-kit', 'argan-oil-serum'],
    savingUsd: 22,
    badge: '🔥 Most Popular',
  },
  {
    id: 'deep-wave-queen',
    name: 'Deep Wave Queen Bundle',
    description: 'Deep wave full lace wig paired with curl refresher spray and satin bonnet for daily care.',
    productSlugs: ['deep-wave-full-lace-wig', 'curl-refresher-spray', 'satin-bonnet-set'],
    savingUsd: 18,
    badge: '✨ New',
  },
  {
    id: 'bundle-build',
    name: '3-Bundle Hair Build',
    description: 'Three virgin hair bundles in body wave to achieve a full sew-in or custom wig installation.',
    productSlugs: ['body-wave-virgin-hair-bundles', 'straight-hair-bundles', 'lace-closure-4x4'],
    savingUsd: 30,
    badge: '💰 Best Value',
  },
  {
    id: 'beauty-essentials',
    name: 'Beauty Essentials Set',
    description: 'Curated beauty kit — face serum, edge control, and lash kit — for the complete glam look.',
    productSlugs: ['vitamin-c-glow-serum', 'edge-control-wax', 'mink-lash-collection'],
    savingUsd: 15,
  },
]

/**
 * Return bundles that include a given product slug.
 */
export function getBundlesForProduct(slug: string): Bundle[] {
  return bundles.filter(b => b.productSlugs.includes(slug))
}
