import { products } from '@/lib/products'
import ProductDetail from './ProductDetail'
import type { Metadata } from 'next'

export function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = products.find(p => p.slug === params.slug)
  if (!product) return { title: 'Product Not Found' }
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} | Taries Beauty Emporium`,
      description: product.description,
      images: [{ url: product.images[0], width: 800, height: 800, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.images[0]],
    },
    other: {
      'product:price:amount': String(product.price),
      'product:price:currency': 'USD',
    },
  }
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductDetail slug={params.slug} />
}
