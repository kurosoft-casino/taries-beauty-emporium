'use client'
import { logoSrc } from '@/lib/assets'
import Link from 'next/link'
import { Heart, Globe, Award, Users } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-brand-black-2 border-b border-brand-gold/20 mb-16">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="flex justify-center mb-8">
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-brand-gold/40 shadow-gold-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Taries Beauty Emporium" className="w-full h-full object-contain" />
            </div>
          </div>
          <p className="section-label mb-4">✦ Our Story ✦</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-brand-cream mb-6">
            The <span className="gold-text">Taries Beauty</span> Story
          </h1>
          <p className="font-body text-lg text-brand-cream/60 max-w-2xl mx-auto leading-relaxed">
            Born from a passion for authentic beauty and a desire to bring world-class luxury hair directly to the queens of Africa.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Story */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <p className="section-label mb-3">✦ Who We Are ✦</p>
            <h2 className="font-heading text-3xl font-bold text-brand-cream mb-5">
              Luxury Hair, <span className="gold-text">Direct to You</span>
            </h2>
            <div className="space-y-4 font-body text-sm text-brand-cream/60 leading-relaxed">
              <p>Taries Beauty Emporium was founded with one powerful vision: to make world-class human hair accessible to every queen across Africa — without the premium markup of local middlemen.</p>
              <p>We&apos;re based directly in Guangzhou, China, the global capital of the hair manufacturing industry. This means we work hand-in-hand with the factories that produce the hair everyone else resells — and we pass those savings directly to you.</p>
              <p>Every wig, every bundle, every custom piece goes through our rigorous quality control process before it ships. No synthetic fillers, no misleading descriptions, no compromises. Just 100% authentic human hair, curated with love.</p>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-brand-black-2 border border-brand-gold/20 flex items-center justify-center p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Brand" className="w-full h-full max-w-[280px] object-contain drop-shadow-[0_0_40px_rgba(212,175,55,0.3)]" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gold-gradient" />
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <p className="section-label mb-3">✦ What We Stand For ✦</p>
            <h2 className="font-heading text-3xl font-bold text-brand-cream">Our <span className="gold-text">Core Values</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award,  title: 'Authenticity',    desc: 'Every product is 100% what we say it is. No exceptions, no compromises.' },
              { icon: Heart,  title: 'Queen-First',     desc: 'Every decision we make starts with one question: is this best for our queens?' },
              { icon: Globe,  title: 'Direct Access',   desc: 'Factory-direct sourcing means lower prices without lower quality.' },
              { icon: Users,  title: 'Community',       desc: 'We celebrate and uplift the beauty of African women everywhere.' },
            ].map((v, i) => (
              <div key={v.title} className="gold-border-rounded p-6 bg-brand-black-2 text-center group hover:bg-brand-black-3 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <v.icon size={20} className="text-brand-black" />
                </div>
                <h3 className="font-heading text-base font-semibold text-brand-cream mb-2">{v.title}</h3>
                <p className="font-body text-xs text-brand-cream/50 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping map */}
        <div className="text-center mb-16">
          <p className="section-label mb-3">✦ Our Reach ✦</p>
          <h2 className="font-heading text-3xl font-bold text-brand-cream mb-8">
            China <span className="gold-text">→</span> Your Door
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { flag: '🇨🇳', location: 'Guangzhou, China', role: 'Manufacturing & QC Hub', sub: 'Where your luxury is born' },
              { flag: '🇳🇬', location: 'Nigeria',          role: 'Primary Market',         sub: 'Lagos, Abuja, PH & more' },
              { flag: '🇬🇭', location: 'Ghana',            role: 'Primary Market',         sub: 'Accra, Kumasi & beyond' },
              { flag: '🇰🇪', location: 'Kenya',            role: 'Growth Market',          sub: 'Nairobi & beyond' },
              { flag: '🇿🇦', location: 'South Africa',     role: 'Growth Market',          sub: 'Johannesburg & Cape Town' },
            ].map(loc => (
              <div key={loc.location} className="gold-border-rounded p-6 bg-brand-black-2 text-center">
                <div className="text-4xl mb-3">{loc.flag}</div>
                <h3 className="font-heading text-base font-semibold text-brand-cream">{loc.location}</h3>
                <p className="font-body text-xs text-brand-gold-2 mt-1 tracking-wider uppercase">{loc.role}</p>
                <p className="font-body text-xs text-brand-cream/40 mt-1">{loc.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-16 border-t border-brand-gold/20">
          <h2 className="font-heading text-3xl font-bold text-brand-cream mb-4">
            Ready to <span className="gold-text">Glow Up?</span>
          </h2>
          <p className="font-body text-brand-cream/50 mb-8">Join over 12,000 queens who trust Taries Beauty Emporium.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop" className="btn-gold">Shop the Collection</Link>
            <Link href="/custom-wigs" className="btn-outline-gold">Order a Custom Wig</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
