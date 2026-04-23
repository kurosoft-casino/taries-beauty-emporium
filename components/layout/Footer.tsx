'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Heart } from 'lucide-react'
import { logoSrc } from '@/lib/assets'

const SocialIcons = {
  Instagram: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  ),
  Facebook: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  ),
  Youtube: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
  ),
  TikTok: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
    </svg>
  ),
}

const footerLinks = {
  shop: [
    { label: 'Human Hair Wigs',   href: '/shop?category=wigs' },
    { label: 'Hair Bundles',       href: '/shop?category=bundles' },
    { label: 'Custom Wigs',        href: '/shop?category=custom-wigs' },
    { label: 'Hair Maintenance',   href: '/shop?category=maintenance' },
    { label: 'Beauty Products',    href: '/shop?category=beauty' },
    { label: 'Female Coats',       href: '/shop?category=coats' },
  ],
  info: [
    { label: 'About Us',          href: '/about' },
    { label: 'FAQ',               href: '/faq' },
    { label: 'Shipping Policy',   href: '/shipping' },
    { label: 'Returns & Refunds', href: '/returns' },
    { label: 'Privacy Policy',    href: '/privacy' },
    { label: 'Size Guide',        href: '/size-guide' },
    { label: 'Wig Care Guide',    href: '/wig-care' },
    { label: 'Track My Order',    href: '/track-order' },
    { label: 'Contact Us',        href: '/contact' },
    { label: '🏪 Sell with Us',   href: '/vendors' },
  ],
}

const socials = [
  { icon: SocialIcons.Instagram, href: 'https://www.instagram.com/taries_beauty_emporium?igsh=dGhkc2Z0NGl0Z28z', label: 'Instagram' },
  { icon: SocialIcons.Facebook,  href: 'https://www.facebook.com/profile.php?id=61562398227659&mibextid=wwXIfr', label: 'Facebook' },
  { icon: SocialIcons.Youtube,   href: 'https://www.youtube.com/@Taries_beauty_channel', label: 'YouTube' },
  { icon: SocialIcons.TikTok,    href: '#', label: 'TikTok' },
]

export default function Footer() {
  return (
    <footer className="bg-brand-black-2 border-t border-brand-gold/20 pt-16 pb-8 relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb orb-gold w-96 h-96 bottom-0 right-0 opacity-20" />
      <div className="orb orb-amber w-64 h-64 top-0 left-1/4 opacity-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 pb-12 border-b border-brand-gold/20">
          {/* Brand col */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-brand-gold/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="Taries Beauty" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-heading text-base font-bold gold-text leading-tight">TARIES BEAUTY</p>
                <p className="font-body text-[9px] tracking-[0.4em] text-brand-gold-2 uppercase">Emporium</p>
              </div>
            </Link>
            <p className="font-body text-sm text-brand-cream/60 leading-relaxed mb-6">
              Premium luxury hair & beauty. Sourced directly from manufacturers in Guangzhou, China. Shipped with love to Nigeria & Ghana.
            </p>
            <div className="flex items-center gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full border border-brand-gold/30 flex items-center justify-center text-brand-gold-2 hover:bg-gold-gradient hover:text-brand-black hover:border-transparent transition-all duration-300"
                >
                  <Icon />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Shop links */}
          <div>
            <h4 className="font-heading text-brand-gold-2 text-base font-semibold mb-5 tracking-wide">Our Collections</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="font-body text-sm text-brand-cream/60 hover:text-brand-gold-3 transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-3 h-px bg-gold-gradient transition-all duration-300" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div>
            <h4 className="font-heading text-brand-gold-2 text-base font-semibold mb-5 tracking-wide">Information</h4>
            <ul className="space-y-3">
              {footerLinks.info.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="font-body text-sm text-brand-cream/60 hover:text-brand-gold-3 transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-3 h-px bg-gold-gradient transition-all duration-300" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & shipping */}
          <div>
            <h4 className="font-heading text-brand-gold-2 text-base font-semibold mb-5 tracking-wide">Get In Touch</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-brand-gold-2 mt-0.5 shrink-0" />
                <p className="font-body text-sm text-brand-cream/60">Ships from Guangzhou, China<br />Delivers to Nigeria & Ghana</p>
              </li>
              <li>
                <a href="https://wa.me/2349035412919" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-body text-sm text-brand-cream/60 hover:text-brand-gold-3 transition-colors">
                  <Phone size={16} className="text-brand-gold-2 shrink-0" />
                  WhatsApp: +234 903 541 2919
                </a>
              </li>
              <li>
                <a href="mailto:tariesbeautye@gmail.com" className="flex items-center gap-3 font-body text-sm text-brand-cream/60 hover:text-brand-gold-3 transition-colors">
                  <Mail size={16} className="text-brand-gold-2 shrink-0" />
                  tariesbeautye@gmail.com
                </a>
              </li>
            </ul>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              {['🔒 Secure Pay', '✈️ Fast Ship', '💯 Authentic', '🔄 Easy Returns'].map(badge => (
                <span key={badge} className="font-body text-xs text-brand-gold-2/70 bg-brand-gold/5 border border-brand-gold/10 rounded px-2 py-1 text-center">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="py-10 border-b border-brand-gold/20 text-center">
          <h3 className="font-heading text-2xl text-brand-cream mb-2">
            Join the <span className="gold-text">Taries Beauty</span> Family
          </h3>
          <p className="font-body text-sm text-brand-cream/60 mb-6">Get exclusive deals, new arrivals & beauty tips — straight to your inbox.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-brand-black-3 border border-brand-gold/30 text-brand-cream placeholder-brand-cream/30 font-body text-sm px-4 py-3 rounded-none focus:outline-none focus:border-brand-gold-2"
            />
            <button type="submit" className="btn-gold shrink-0">Subscribe</button>
          </form>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-brand-cream/40 text-center sm:text-left">
            © {new Date().getFullYear()} Taries Beauty Emporium. All rights reserved.
          </p>
          <p className="font-body text-xs text-brand-cream/40 flex items-center gap-1">
            Crafted with <Heart size={12} className="text-brand-gold-2 fill-current" /> in China, for queens in Nigeria & Ghana
          </p>
          <div className="flex items-center gap-3">
            {['visa', 'mastercard', 'paystack', 'transfer'].map(p => (
              <span key={p} className="font-body text-[10px] tracking-widest text-brand-gold-2/50 uppercase border border-brand-gold/10 px-2 py-0.5 rounded">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
