'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from './products'

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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      currency: 'NGN',

      addItem: (product, variants = {}) => {
        const key = variantKey(variants)
        set(state => {
          const existing = state.items.find(
            i => i.product.id === product.id && variantKey(i.selectedVariants) === key
          )
          if (existing) {
            return {
              items: state.items.map(i =>
                i.product.id === product.id && variantKey(i.selectedVariants) === key
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: 1, selectedVariants: variants }] }
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
        set(state => ({
          items: state.items.map(i =>
            i.product.id === productId && variantKey(i.selectedVariants) === key
              ? { ...i, quantity: qty }
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
    { name: 'taries-cart', partialize: state => ({ items: state.items, currency: state.currency }) }
  )
)
