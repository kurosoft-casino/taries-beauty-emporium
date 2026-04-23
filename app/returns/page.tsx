import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Returns & Refunds',
  description: 'Taries Beauty Emporium return and refund policy. We want you to love every purchase.',
}

const policies = [
  {
    icon: '✅',
    title: 'Our Return Promise',
    content: `Your satisfaction is our priority. If you are not completely satisfied with your purchase, we offer returns and exchanges under the conditions below.`,
  },
  {
    icon: '📋',
    title: 'Eligibility',
    content: `Items are eligible for return within 7 days of delivery if:

• The item is unused, unworn, and in its original packaging.
• Tags are still attached and intact.
• The item is not a custom/made-to-order wig (these are non-returnable unless defective).
• You have proof of purchase (order number or payment receipt).`,
  },
  {
    icon: '🚫',
    title: 'Non-Returnable Items',
    content: `The following items cannot be returned or refunded:

• Custom-made wigs (orders made to your specific measurements and preferences).
• Hair care and beauty products that have been opened or used.
• Items purchased during clearance/final sale.
• Items damaged due to improper care or use.`,
  },
  {
    icon: '🔄',
    title: 'Refund Process',
    content: `Once your return is received and inspected, we will notify you via WhatsApp or email within 3 business days.

• Approved refunds are processed within 5–7 business days.
• Refunds are issued to your original payment method or as store credit.
• Shipping costs are non-refundable.
• You are responsible for return shipping costs unless the item was defective.`,
  },
  {
    icon: '🔁',
    title: 'Exchanges',
    content: `We happily exchange items for a different size, length, or colour where stock is available. Contact us on WhatsApp within 7 days of delivery to initiate an exchange.`,
  },
  {
    icon: '⚠️',
    title: 'Defective or Wrong Items',
    content: `If you receive a defective, damaged, or incorrect item, please contact us within 48 hours of delivery with photos and your order number. We will arrange a full replacement or refund at no cost to you.`,
  },
  {
    icon: '📞',
    title: 'How to Start a Return',
    content: `1. WhatsApp us at +234 903 541 2919 with your order number and reason for return.
2. We will provide return instructions and a return address.
3. Ship the item back using a trackable courier.
4. Share the tracking number with us.
5. Await confirmation and refund/exchange processing.`,
  },
]

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-brand-black">
      <div className="relative bg-brand-black-2 border-b border-brand-gold/20 py-20 text-center overflow-hidden">
        <div className="orb orb-gold w-96 h-96 -top-20 left-1/2 -translate-x-1/2 opacity-20" />
        <div className="relative z-10">
          <p className="font-body text-xs tracking-[0.4em] text-brand-gold-2 uppercase mb-4">Policies</p>
          <h1 className="font-heading text-4xl md:text-5xl text-brand-cream mb-4">
            Returns <span className="gold-text">&amp; Refunds</span>
          </h1>
          <p className="font-body text-brand-cream/60 max-w-xl mx-auto">
            We want you to love every purchase. Here is everything you need to know about our return policy.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        {policies.map((policy) => (
          <div key={policy.title} className="bg-brand-black-2 border border-brand-gold/10 rounded p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{policy.icon}</span>
              <h2 className="font-heading text-xl text-brand-cream">{policy.title}</h2>
            </div>
            <p className="font-body text-sm text-brand-cream/70 leading-relaxed whitespace-pre-line">{policy.content}</p>
          </div>
        ))}

        <div className="text-center py-8 space-y-4">
          <p className="font-body text-brand-cream/60">Need help with a return?</p>
          <a
            href="https://wa.me/2349035412919?text=Hi! I need help with a return."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center gap-2"
          >
            💬 Chat on WhatsApp
          </a>
          <div className="pt-4">
            <Link href="/shop" className="font-body text-sm text-brand-gold-2 hover:text-brand-gold-3 underline underline-offset-4">
              ← Back to Shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
