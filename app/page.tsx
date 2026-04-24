'use client'
import HeroSection from '@/components/home/HeroSection'
import MarqueeTicker from '@/components/home/MarqueeTicker'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import StatsSection from '@/components/home/StatsSection'
import Testimonials from '@/components/home/Testimonials'
import WhyUs from '@/components/home/WhyUs'
import ShippingBanner from '@/components/home/ShippingBanner'
import RecentlyViewedBar from '@/components/shop/RecentlyViewedBar'
import { useLang } from '@/lib/lang'

export default function HomePage() {
  const { lang } = useLang()

  return (
    <>
      <HeroSection />
      <MarqueeTicker />
      <CategoryGrid />
      <FeaturedProducts
        title={lang === 'ZH' ? '热销爆款' : 'Bestselling Products'}
        subtitle={lang === 'ZH' ? '最受欢迎的人气单品，专为女王们挑选' : 'Our most-loved pieces — picked by queens, for queens'}
        filter={(p) => p.badge === 'bestseller'}
        limit={8}
      />
      <StatsSection />
      <FeaturedProducts
        title={lang === 'ZH' ? '新品上架' : 'New Arrivals'}
        subtitle={lang === 'ZH' ? '最新到货，抢先体验你的下一件心头好' : 'Fresh drops just landed — be the first to wear them'}
        filter={(p) => p.badge === 'new'}
        limit={4}
        viewAllHref="/shop?badge=new"
      />
      <WhyUs />
      <Testimonials />
      <ShippingBanner />
      <RecentlyViewedBar />
    </>
  )
}
