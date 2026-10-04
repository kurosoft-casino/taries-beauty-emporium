'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from './remoteApi'
import {
  mapRemoteOverrideRow,
  mapRemoteProductRow,
  mergeStorefrontProducts,
  type RemoteOverrideRow,
  type RemoteProductRow,
  type StorefrontProduct,
} from './catalog'

/**
 * Storefront catalog with live API products merged over the static catalogue.
 * Falls back to the local catalogue/vendor products when the API is unreachable.
 */
export function useStorefrontCatalog(): StorefrontProduct[] {
  const [products, setProducts] = useState<StorefrontProduct[]>([])

  useEffect(() => {
    let active = true

    async function load() {
      const [productsRes, overridesRes] = await Promise.all([
        apiRequest<{ products?: RemoteProductRow[] }>('/products'),
        apiRequest<{ overrides?: RemoteOverrideRow[] }>('/products/overrides'),
      ])
      if (!active) return

      const remoteProducts =
        productsRes.ok && Array.isArray(productsRes.data?.products)
          ? productsRes.data.products.map(mapRemoteProductRow)
          : []
      const remoteOverrides =
        overridesRes.ok && Array.isArray(overridesRes.data?.overrides)
          ? Object.fromEntries(overridesRes.data.overrides.map(row => {
              const override = mapRemoteOverrideRow(row)
              return [override.slug, override]
            }))
          : {}

      setProducts(mergeStorefrontProducts(remoteProducts, remoteOverrides))
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return products
}
