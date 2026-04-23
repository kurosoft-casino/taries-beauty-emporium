import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Taries Beauty Emporium',
  description: 'How Taries Beauty Emporium collects, uses and protects your personal data.',
}

const sections = [
  {
    title: '1. Information We Collect',
    body: `When you place an order or contact us we collect: your name, email address, phone number, shipping address, and order details. When you browse our site we may collect non-personal data such as browser type and pages visited.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to: process and fulfil your orders; communicate order updates and shipping notifications via WhatsApp or email; respond to your enquiries; improve our website and services; and send promotional updates (only if you opt in).`,
  },
  {
    title: '3. Sharing Your Data',
    body: `We do not sell, trade, or rent your personal information to third parties. We may share your shipping details with our logistics and freight partners solely for the purpose of delivering your order from Guangzhou, China to Nigeria or Ghana.`,
  },
  {
    title: '4. Data Storage & Security',
    body: `Order and cart data is currently stored in your browser's local storage on your device. We do not store payment card details. We take reasonable precautions to protect your information but cannot guarantee absolute security over internet transmissions.`,
  },
  {
    title: '5. Cookies',
    body: `We use essential cookies and local storage to maintain your shopping cart, language preference, and currency selection. We may also use analytics cookies to understand how visitors use our site. You can disable cookies in your browser settings, but this may affect site functionality.`,
  },
  {
    title: '6. Your Rights (NDPA Compliance)',
    body: `Under the Nigeria Data Protection Act (NDPA) 2023 and similar legislation, you have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; and opt out of marketing communications. To exercise any of these rights, contact us at tariesbeautye@gmail.com or WhatsApp +234 903 541 2919.`,
  },
  {
    title: "7. Children's Privacy",
    body: `Our services are not directed to children under 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately.`,
  },
  {
    title: '8. Changes to This Policy',
    body: `We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last revised" date. Continued use of the site after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '9. Contact Us',
    body: `For privacy-related enquiries, contact: Taries Beauty Emporium · Email: tariesbeautye@gmail.com · WhatsApp: +234 903 541 2919 · Guangzhou, China`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="section-label mb-4">✦ Legal ✦</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-brand-cream mb-4">
            Privacy <span className="gold-text">Policy</span>
          </h1>
          <p className="font-body text-sm text-brand-cream/40">Last revised: April 2026</p>
        </div>

        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-lg p-6 mb-10">
          <p className="font-body text-sm text-brand-cream/70 leading-relaxed">
            Taries Beauty Emporium (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy.
            This policy explains how we collect, use, and safeguard your personal information when you use our website or purchase our products.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((s, i) => (
            <div key={i} className="border-b border-brand-gold/10 pb-8 last:border-0">
              <h2 className="font-heading text-lg font-bold text-brand-gold-3 mb-3">{s.title}</h2>
              <p className="font-body text-sm text-brand-cream/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-brand-gold/20 flex flex-wrap gap-4 text-sm font-body">
          <Link href="/returns" className="text-brand-gold-2 hover:text-brand-gold transition-colors">Returns Policy</Link>
          <Link href="/shipping" className="text-brand-gold-2 hover:text-brand-gold transition-colors">Shipping Policy</Link>
          <Link href="/faq" className="text-brand-gold-2 hover:text-brand-gold transition-colors">FAQ</Link>
          <Link href="/contact" className="text-brand-gold-2 hover:text-brand-gold transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
