'use client'
import { useCartStore } from '@/lib/store'

export function CartProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
