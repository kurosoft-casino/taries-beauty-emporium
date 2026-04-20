'use client'
import HeroSection from '@/components/home/HeroSection'
import MarqueeTicker from '@/components/home/MarqueeTicker'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import StatsSection from '@/components/home/StatsSection'
import Testimonials from '@/components/home/Testimonials'
import WhyUs from '@/components/home/WhyUs'
import ShippingBanner from '@/components/home/ShippingBanner'
import { products } from '@/lib/products'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <MarqueeTicker />
      <CategoryGrid />
      <FeaturedProducts
        title="Bestselling Products"
        subtitle="Our most-loved pieces — picked by queens, for queens"
        filter={(p) => p.badge === 'bestseller'}
        limit={8}
      />
      <StatsSection />
      <FeaturedProducts
        title="New Arrivals"
        subtitle="Fresh drops just landed — be the first to wear them"
        filter={(p) => p.badge === 'new'}
        limit={4}
        viewAllHref="/shop?badge=new"
      />
      <WhyUs />
      <Testimonials />
      <ShippingBanner />
    </>
  )
}
