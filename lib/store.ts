'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from './products'
import { getStorefrontProducts } from './catalog'

export type Currency = 'NGN' | 'GHS' | 'USD' | 'CNY'

export interface CartItem {
  product: Product
  quantity: number
  selectedVariants: Record<string, string>
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  currency: Currency
  addItem: (product: Product, variants?: Record<string, string>) => void
  removeItem: (productId: string, variants?: Record<string, string>) => void
  updateQuantity: (productId: string, qty: number, variants?: Record<string, string>) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  setCurrency: (c: Currency) => void
  getTotalItems: () => number
  getTotalUSD: () => number
}

function variantKey(variants?: Record<string, string>) {
  if (!variants) return ''
  return Object.entries(variants).sort().map(([k, v]) => `${k}:${v}`).join('|')
}

function getLiveProduct(productId: string): Product | null {
  const live = getStorefrontProducts().find(product => product.id === productId)
  return live ?? null
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      currency: 'NGN',

      addItem: (product, variants = {}) => {
        const key = variantKey(variants)
        set(state => {
          const liveProduct = getLiveProduct(product.id) ?? product
          if (!liveProduct.inStock) return state
          const existing = state.items.find(
            i => i.product.id === product.id && variantKey(i.selectedVariants) === key
          )
          if (existing) {
            if (liveProduct.stockCount && existing.quantity >= liveProduct.stockCount) {
              return state
            }
            return {
              items: state.items.map(i =>
                i.product.id === product.id && variantKey(i.selectedVariants) === key
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product: liveProduct, quantity: 1, selectedVariants: variants }] }
        })
      },

      removeItem: (productId, variants = {}) => {
        const key = variantKey(variants)
        set(state => ({
          items: state.items.filter(
            i => !(i.product.id === productId && variantKey(i.selectedVariants) === key)
          ),
        }))
      },

      updateQuantity: (productId, qty, variants = {}) => {
        const key = variantKey(variants)
        if (qty <= 0) { get().removeItem(productId, variants); return }
        const liveProduct = getLiveProduct(productId)
        if (liveProduct && !liveProduct.inStock) {
          get().removeItem(productId, variants)
          return
        }
        const nextQty = liveProduct?.stockCount ? Math.min(qty, liveProduct.stockCount) : qty
        set(state => ({
          items: state.items.map(i =>
            i.product.id === productId && variantKey(i.selectedVariants) === key
              ? { ...i, quantity: nextQty }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),
      openCart:   () => set({ isOpen: true }),
      closeCart:  () => set({ isOpen: false }),
      setCurrency: (c) => set({ currency: c }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getTotalUSD:   () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    }),
    { name: 'taries-cart', partialize: state => ({ items: state.items, currency: state.currency }), skipHydration: true }
  )
)
