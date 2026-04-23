import { Suspense } from 'react'
import type { Metadata } from 'next'
import InvoiceClient from './InvoiceClient'

export const metadata: Metadata = {
  title: 'Invoice | Taries Beauty Emporium',
  description: 'Your order invoice from Taries Beauty Emporium',
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <InvoiceClient />
    </Suspense>
  )
}
