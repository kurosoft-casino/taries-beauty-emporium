import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Learn about Taries Beauty Emporium shipping times, costs and process from Guangzhou, China to Nigeria and Ghana.',
}

const sections = [
  {
    icon: '✈️',
    title: 'How We Ship',
    content: `All orders are shipped directly from our warehouse in Guangzhou, China via trusted international couriers (DHL, FedEx, or EMS). We work directly with manufacturers to ensure authenticity and the fastest possible dispatch.`,
  },
  {
    icon: '⏱️',
    title: 'Delivery Timeframes',
    content: null,
    table: [
      { destination: 'Nigeria (Lagos, Abuja, PH)', standard: '7–14 business days', express: '3–5 business days' },
      { destination: 'Nigeria (Other states)', standard: '10–18 business days', express: '5–7 business days' },
      { destination: 'Ghana (Accra, Kumasi)', standard: '7–14 business days', express: '3–5 business days' },
      { destination: 'Ghana (Other regions)', standard: '10–18 business days', express: '5–8 business days' },
    ],
  },
  {
    icon: '💰',
    title: 'Shipping Costs',
    content: `Shipping fees are calculated at checkout based on the weight of your order and your delivery address.

• Orders above ₦150,000 / GH₵1,500 qualify for FREE standard shipping.
• Express shipping is available at an additional fee, calculated at checkout.
• Import duties and customs fees (if applicable) are the responsibility of the buyer.`,
  },
  {
    icon: '📦',
    title: 'Order Processing',
    content: `• Standard orders are processed within 1–2 business days of payment confirmation.
• Custom wig orders require 5–10 business days for production before shipping.
• You will receive a tracking number via WhatsApp once your order is dispatched.
• Tracking updates may take 24–48 hours to appear after dispatch.`,
  },
  {
    icon: '🔒',
    title: 'Packaging & Discretion',
    content: `All orders are carefully packed in neutral, unmarked packaging to ensure safe delivery. Hair products are sealed in protective bags to maintain quality during transit.`,
  },
  {
    icon: '❓',
    title: 'Delays & Lost Packages',
    content: `If your package has not arrived after 21 business days, please contact us via WhatsApp at +234 903 541 2919 and we will investigate immediately.`,
  },
]

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-brand-black">
      <div className="relative bg-brand-black-2 border-b border-brand-gold/20 py-20 text-center overflow-hidden">
        <div className="orb orb-gold w-96 h-96 -top-20 left-1/2 -translate-x-1/2 opacity-20" />
        <div className="relative z-10">
          <p className="font-body text-xs tracking-[0.4em] text-brand-gold-2 uppercase mb-4">Policies</p>
          <h1 className="font-heading text-4xl md:text-5xl text-brand-cream mb-4">
            Shipping <span className="gold-text">Policy</span>
          </h1>
          <p className="font-body text-brand-cream/60 max-w-xl mx-auto">
            We ship directly from Guangzhou, China — straight to your door in Nigeria or Ghana.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-brand-black-2 border border-brand-gold/10 rounded p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="font-heading text-xl text-brand-cream">{section.title}</h2>
            </div>
            {section.content && (
              <p className="font-body text-sm text-brand-cream/70 leading-relaxed whitespace-pre-line">{section.content}</p>
            )}
            {section.table && (
              <div className="overflow-x-auto mt-4">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-brand-gold/20">
                      <th className="text-left py-2 pr-4 text-brand-gold-2 font-semibold">Destination</th>
                      <th className="text-left py-2 pr-4 text-brand-gold-2 font-semibold">Standard</th>
                      <th className="text-left py-2 text-brand-gold-2 font-semibold">Express</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.map((row) => (
                      <tr key={row.destination} className="border-b border-brand-gold/5">
                        <td className="py-3 pr-4 text-brand-cream/80">{row.destination}</td>
                        <td className="py-3 pr-4 text-brand-cream/60">{row.standard}</td>
                        <td className="py-3 text-brand-gold-3">{row.express}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        <div className="text-center py-8 space-y-4">
          <p className="font-body text-brand-cream/60">Questions about your order?</p>
          <a
            href="https://wa.me/2349035412919?text=Hi! I have a question about shipping."
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
