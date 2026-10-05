import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for shopping with Taries Beauty Emporium.',
}

const sections = [
  {
    title: 'Ordering',
    body: 'By placing an order, you confirm that the delivery details you provided are accurate and that you are authorised to use the selected payment method. Orders are subject to acceptance and stock availability.',
  },
  {
    title: 'Pricing & Promotions',
    body: 'All prices are shown in USD with local currency conversions for convenience. Promotions, bundle savings, and discount codes may be withdrawn or updated at any time and cannot be combined unless clearly stated.',
  },
  {
    title: 'Shipping & Delivery',
    body: 'Orders ship from Guangzhou, China to all countries we serve across Africa. Delivery windows are estimates and may be affected by customs, carrier delays, or force majeure events. Import duties, where applicable, are the customer’s responsibility.',
  },
  {
    title: 'Returns',
    body: 'Return eligibility is governed by our Returns & Refund Policy. Custom-made wigs, worn items, and opened beauty products are not returnable unless they arrive damaged or incorrect.',
  },
  {
    title: 'Vendor Marketplace',
    body: 'Marketplace items listed by approved vendors remain subject to Taries Beauty Emporium moderation. Vendor products may be removed or hidden if they do not meet platform standards or are no longer available.',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p className="section-label mb-3">Legal</p>
        <h1 className="font-display text-4xl gold-text mb-4">Terms & Conditions</h1>
        <p className="font-body text-brand-cream/60 leading-relaxed mb-8">
          These terms govern the use of the Taries Beauty Emporium website and all purchases made through it.
          By browsing or ordering, you agree to these terms together with our{' '}
          <Link href="/privacy" className="text-brand-gold-3 hover:text-brand-gold">Privacy Policy</Link> and{' '}
          <Link href="/returns" className="text-brand-gold-3 hover:text-brand-gold">Returns Policy</Link>.
        </p>

        <div className="space-y-5">
          {sections.map(section => (
            <section key={section.title} className="bg-brand-black-2 border border-brand-gold/20 p-5">
              <h2 className="font-heading text-xl text-brand-cream mb-2">{section.title}</h2>
              <p className="font-body text-sm text-brand-cream/60 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
