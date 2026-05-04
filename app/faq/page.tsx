'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MessageCircle } from 'lucide-react'

const categories = [
  {
    label: '🛍️ Orders & Payment',
    faqs: [
      {
        q: 'How do I place an order?',
        a: 'Browse our shop, select your preferred options (length, density, cap size), add to cart and proceed to checkout. You can also order directly via WhatsApp on +234 903 541 2919.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept secure Flutterwave checkout (card, transfer, and supported mobile money options) plus manual bank transfer where applicable. Payment options are shown at checkout based on your order currency.',
      },
      {
        q: 'Can I modify or cancel my order?',
        a: 'Orders can be modified or cancelled within 24 hours of placement. After 24 hours, your order may already be in production or dispatch. Contact us immediately via WhatsApp if you need to make changes.',
      },
      {
        q: 'Do you have discount codes?',
        a: 'Yes! Use BEAUTY10 for 10% off, WELCOME15 for 15% off your first order, HAIR20 for 20% off wigs and bundles, or TARIES25 for 25% off (VIP customers). Enter your code at checkout.',
      },
      {
        q: 'Is it safe to order online?',
        a: 'Absolutely. Your order data is securely handled and we never store payment card information. All orders are confirmed via WhatsApp or email with a detailed invoice.',
      },
    ],
  },
  {
    label: '✈️ Shipping & Delivery',
    faqs: [
      {
        q: 'Where do you ship from?',
        a: 'All orders ship directly from our manufacturer partners in Guangzhou, China — ensuring you receive genuine, factory-fresh products at the best prices.',
      },
      {
        q: 'How long does delivery take?',
        a: 'Standard air freight takes 7–14 business days to Nigeria and Ghana after order confirmation. Express options (3–5 business days) are available on request.',
      },
      {
        q: 'How is shipping cost calculated?',
        a: 'Shipping is charged by weight. General goods cost $8.70/kg and beauty/care products cost $10.90/kg from China. A minimum of 10 kg is charged per shipment. The exact cost is shown at checkout.',
      },
      {
        q: 'Do I get free shipping?',
        a: 'Yes! Orders totalling $200 USD or more qualify for free standard shipping. Bundle your order to save on shipping.',
      },
      {
        q: 'Can I track my order?',
        a: 'Yes! Once dispatched, you will receive a tracking number via WhatsApp and email within 48 hours. You can also track your order on our Track Order page.',
      },
      {
        q: 'Do you handle customs clearance?',
        a: 'We ship with all required customs documentation. Some orders may attract import duties payable by the recipient upon arrival. We will notify you of any known duties in advance.',
      },
    ],
  },
  {
    label: '💇‍♀️ Products & Hair',
    faqs: [
      {
        q: 'Is the hair 100% human hair?',
        a: 'Yes. All our wigs and bundles are made from 100% virgin human hair sourced directly from manufacturers. No synthetic fibres, no blends.',
      },
      {
        q: 'Can I dye, bleach or heat-style the hair?',
        a: 'Yes. Because it is 100% human hair, you can dye, bleach, curl, straighten and heat-style it just like your own hair. We recommend using a heat protectant and professional colourist for best results.',
      },
      {
        q: 'What density should I choose?',
        a: '150% density gives a natural, everyday look. 180% is fuller and more glamorous. 250% is extra thick and dramatic. If in doubt, 180% is the most popular choice.',
      },
      {
        q: 'What is the difference between lace front and full lace?',
        a: 'A lace front wig has lace only along the hairline (front), giving a natural-looking hairline. A full lace wig has lace all around the cap, allowing you to part the hair anywhere and style it up into a ponytail.',
      },
      {
        q: 'How do I measure my cap size?',
        a: 'Measure the circumference of your head from your hairline at the front, around to the nape of your neck and back. Small is 21", Medium is 22" and Large is 23". Most people wear a medium.',
      },
      {
        q: 'Can I order a custom wig?',
        a: 'Yes! We offer fully custom wigs. Visit our Custom Wigs page to submit your specifications — texture, length, density, lace type, colour, and more. Custom orders take 2–3 weeks.',
      },
    ],
  },
  {
    label: '🔄 Returns & Refunds',
    faqs: [
      {
        q: 'What is your return policy?',
        a: 'Items in unused, unworn condition with original packaging can be returned within 7 days of delivery. Please see our Returns Policy page for full details.',
      },
      {
        q: 'What if my item arrives damaged?',
        a: 'If you receive a damaged or incorrect item, contact us within 48 hours via WhatsApp with photos. We will arrange a replacement or full refund at no additional cost to you.',
      },
      {
        q: 'Can I return a wig I have worn?',
        a: 'For hygiene reasons, worn wigs cannot be returned unless they arrived defective or different from what was ordered. Please check your item carefully before first wear.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Approved refunds are processed within 3–5 business days. The amount will be returned to your original payment method or via bank transfer.',
      },
    ],
  },
  {
    label: '🏪 Vendor & Seller',
    faqs: [
      {
        q: 'How do I become a vendor on Taries Beauty Emporium?',
        a: 'Visit our Vendors page and complete the registration form. There is a one-time non-refundable registration fee of $100 USD. Your application will be reviewed and approved by the admin team within 48–72 hours.',
      },
      {
        q: 'What can I sell as a vendor?',
        a: 'Vendors can sell any relevant products — not limited to hair products. Beauty accessories, clothing, jewellery, and lifestyle products are all welcome, subject to admin approval.',
      },
      {
        q: 'What do vendors get access to?',
        a: 'Approved vendors get a dashboard with product listings, analytics (views per item, sales), and a messaging system to communicate with buyers.',
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-brand-gold/10 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
      >
        <span className="font-heading text-sm font-semibold text-brand-cream group-hover:text-brand-gold-3 transition-colors">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 mt-0.5 text-brand-gold-2 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="font-body text-sm text-brand-cream/60 leading-relaxed pb-5 pr-8">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(0)

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="section-label mb-4">✦ Help Centre ✦</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-brand-cream mb-4">
            Frequently Asked <span className="gold-text">Questions</span>
          </h1>
          <p className="font-body text-brand-cream/50 max-w-xl mx-auto">
            Everything you need to know about ordering, shipping, products and more.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              className={`px-4 py-2 font-body text-xs font-semibold border transition-all duration-200 ${
                activeCategory === i
                  ? 'bg-gold-gradient text-brand-black border-transparent'
                  : 'border-brand-gold/30 text-brand-cream/60 hover:border-brand-gold hover:text-brand-cream'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ list */}
        <div className="bg-brand-black-2 border border-brand-gold/20 px-6 py-2 mb-12">
          {categories[activeCategory].faqs.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>

        {/* Still have questions */}
        <div className="text-center p-8 bg-brand-black-2 border border-brand-gold/20">
          <p className="font-heading text-xl font-bold text-brand-cream mb-2">Still have a question?</p>
          <p className="font-body text-sm text-brand-cream/50 mb-6">Our team typically responds within a few hours via WhatsApp.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://wa.me/2349035412919?text=Hi! I have a question about Taries Beauty Emporium"
              target="_blank" rel="noopener noreferrer"
              className="btn-gold flex items-center gap-2 px-6 py-3"
            >
              <MessageCircle size={16} />
              Chat on WhatsApp
            </a>
            <Link href="/contact" className="btn-outline-gold px-6 py-3">
              Contact Form
            </Link>
          </div>
        </div>

        {/* Policy links */}
        <div className="mt-10 pt-8 border-t border-brand-gold/10 flex flex-wrap justify-center gap-6 text-xs font-body">
          {[
            { label: 'Returns Policy', href: '/returns' },
            { label: 'Shipping Policy', href: '/shipping' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Track Order', href: '/track-order' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="text-brand-gold-2 hover:text-brand-gold transition-colors">{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
