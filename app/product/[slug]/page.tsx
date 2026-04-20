import { products } from '@/lib/products'
import ProductDetail from './ProductDetail'

export function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }))
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductDetail slug={params.slug} />
}
