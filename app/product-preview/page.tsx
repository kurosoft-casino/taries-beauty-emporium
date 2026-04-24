'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Minus, Plus, ShoppingBag, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/products'
import { getVendorProductById } from '@/lib/catalog'

function ProductPreviewContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const product = useMemo(() => getVendorProductById(id), [id])
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const { addItem, openCart, currency } = useCartStore()

  if (!product) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 text-center">
        <div>
          <p className="section-label mb-3">Marketplace</p>
          <h1 className="font-display text-3xl gold-text mb-3">Product Not Available</h1>
          <p className="font-body text-brand-cream/60 mb-6">This vendor product could not be found on this device.</p>
          <Link href="/shop" className="btn-gold">Back to Shop</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-xs text-brand-cream/40">
          <Link href="/" className="hover:text-brand-gold-2">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-brand-gold-2">Shop</Link>
          <span>/</span>
          <span className="text-brand-cream/70">Marketplace Product</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative aspect-square bg-brand-black-2 overflow-hidden">
              <Image src={product.images[activeImg]} alt={product.name} fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
            </div>
            {product.images.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {product.images.map((image, index) => (
                  <button key={image + index} onClick={() => setActiveImg(index)} className={`relative w-16 h-16 overflow-hidden border ${activeImg === index ? 'border-brand-gold' : 'border-brand-gold/20'}`}>
                    <Image src={image} alt="" fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="section-label mb-2">Vendor Marketplace</p>
            <h1 className="font-display text-3xl md:text-4xl text-brand-cream font-bold mb-4">{product.name}</h1>
            <div className="flex items-center gap-3 mb-5">
              <span className="font-display text-3xl gold-text">{formatPrice(product.price, currency)}</span>
              {product.originalPrice && <span className="text-brand-cream/30 line-through">{formatPrice(product.originalPrice, currency)}</span>}
            </div>
            <p className="font-body text-brand-cream/60 leading-relaxed mb-5">{product.shortDesc}</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${product.inStock ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
              <span className="text-xs text-brand-cream/40">Ships from {product.shipsFrom}</span>
            </div>
            {product.video && (
              <div className="mb-6 border border-brand-gold/20 p-3 bg-brand-black-2">
                <div className="flex items-center gap-2 text-brand-gold-2 text-xs uppercase tracking-widest mb-3">
                  <Video size={14} />
                  Product video
                </div>
                <div className="aspect-video overflow-hidden">
                  <iframe src={product.video} title={`${product.name} video`} className="w-full h-full" allowFullScreen />
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs uppercase tracking-widest text-brand-gold-2">Quantity</span>
              <div className="flex items-center border border-brand-gold/20">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-brand-gold-2"><Minus size={14} /></button>
                <span className="w-10 h-10 flex items-center justify-center">{qty}</span>
                <button onClick={() => setQty(q => product.stockCount ? Math.min(product.stockCount, q + 1) : q + 1)} className="w-10 h-10 flex items-center justify-center text-brand-gold-2"><Plus size={14} /></button>
              </div>
            </div>
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => {
                  if (!product.inStock) {
                    toast.error('This item is currently out of stock')
                    return
                  }
                  for (let index = 0; index < qty; index += 1) addItem(product)
                  openCart()
                  toast.success('Added to cart')
                }}
                disabled={!product.inStock}
                className="flex-1 btn-gold disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2"><ShoppingBag size={16} /> {product.inStock ? 'Add to Cart' : 'Sold Out'}</span>
              </button>
              <a
                href={`https://wa.me/${(product.contactWhatsApp || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'd like to order ${product.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                Order via WhatsApp
              </a>
            </div>
            <div className="border border-brand-gold/20 bg-brand-black-2 p-5">
              <h2 className="font-heading text-xl text-brand-cream mb-3">Product Details</h2>
              <p className="font-body text-sm text-brand-cream/60 leading-relaxed mb-4">{product.description}</p>
              <ul className="space-y-2">
                {product.features.map(feature => (
                  <li key={feature} className="text-sm text-brand-cream/60">• {feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-black flex items-center justify-center">
          <p className="font-body text-sm text-brand-cream/60">Loading product...</p>
        </div>
      }
    >
      <ProductPreviewContent />
    </Suspense>
  )
}
