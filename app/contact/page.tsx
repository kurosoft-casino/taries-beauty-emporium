'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const contactMethods = [
  {
    icon: '💬',
    title: 'WhatsApp',
    subtitle: 'Fastest response — usually within 1 hour',
    value: '+234 903 541 2919',
    href: 'https://wa.me/2349035412919?text=Hi Taries Beauty Emporium! I have a question.',
    cta: 'Chat Now',
    highlight: true,
  },
  {
    icon: '📧',
    title: 'Email',
    subtitle: 'We reply within 24 hours',
    value: 'tariesbeautye@gmail.com',
    href: 'mailto:tariesbeautye@gmail.com',
    cta: 'Send Email',
    highlight: false,
  },
  {
    icon: '📍',
    title: 'Warehouse',
    subtitle: 'Shipping origin',
    value: 'Guangzhou, Guangdong Province, China',
    href: null,
    cta: null,
    highlight: false,
  },
  {
    icon: '🕐',
    title: 'Business Hours',
    subtitle: 'China Standard Time (CST, UTC+8)',
    value: 'Mon – Sat: 9:00 AM – 8:00 PM',
    href: null,
    cta: null,
    highlight: false,
  },
]

const faqs = [
  { q: 'How long does delivery take?', a: 'Standard delivery to Nigeria and Ghana takes 7–14 business days. Express shipping options (3–5 days) are available at checkout.' },
  { q: 'Can I track my order?', a: 'Yes! Once your order is dispatched, we will send a tracking number via WhatsApp or email within 24 hours.' },
  { q: 'Do you do custom wigs?', a: 'Absolutely! We specialise in custom wigs. Visit our Custom Wigs page to configure your order and submit your preferences.' },
  { q: 'What payment methods do you accept?', a: 'We accept bank transfers, Paystack (card/USSD), and mobile money (Ghana). All prices are shown in your preferred currency.' },
  { q: 'Are your products 100% human hair?', a: 'Yes. All our wigs and bundles are certified 100% human hair sourced directly from ethical suppliers.' },
]

export default function ContactPage() {
  const [open, setOpen] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const wa = `https://wa.me/2349035412919?text=${encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nSubject: ${form.subject}\n\n${form.message}`
    )}`
    window.open(wa, '_blank')
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Hero */}
      <div className="relative bg-brand-black-2 border-b border-brand-gold/20 py-20 text-center overflow-hidden">
        <div className="orb orb-gold w-96 h-96 -top-20 left-1/2 -translate-x-1/2 opacity-20" />
        <div className="relative z-10">
          <p className="font-body text-xs tracking-[0.4em] text-brand-gold-2 uppercase mb-4">We&apos;re here for you</p>
          <h1 className="font-heading text-4xl md:text-5xl text-brand-cream mb-4">
            Contact <span className="gold-text">Us</span>
          </h1>
          <p className="font-body text-brand-cream/60 max-w-xl mx-auto">
            Have a question, custom order request, or just want to say hi? We would love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {/* Contact Methods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactMethods.map((method, i) => (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-6 rounded border text-center ${
                method.highlight
                  ? 'bg-brand-gold/10 border-brand-gold/40'
                  : 'bg-brand-black-2 border-brand-gold/10'
              }`}
            >
              <div className="text-3xl mb-3">{method.icon}</div>
              <h3 className="font-heading text-brand-cream text-base mb-1">{method.title}</h3>
              <p className="font-body text-xs text-brand-cream/40 mb-3">{method.subtitle}</p>
              <p className="font-body text-sm text-brand-gold-2 font-medium">{method.value}</p>
              {method.href && method.cta && (
                <a
                  href={method.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 inline-block font-body text-xs px-4 py-2 rounded transition-all duration-200 ${
                    method.highlight
                      ? 'bg-brand-gold text-brand-black hover:bg-brand-gold-2 font-semibold'
                      : 'border border-brand-gold/30 text-brand-gold-2 hover:border-brand-gold hover:text-brand-gold-3'
                  }`}
                >
                  {method.cta}
                </a>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="font-heading text-2xl text-brand-cream mb-6">Send us a Message</h2>
            {sent ? (
              <div className="bg-brand-gold/10 border border-brand-gold/30 rounded p-8 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="font-heading text-xl text-brand-cream mb-2">Message Sent!</h3>
                <p className="font-body text-sm text-brand-cream/60 mb-6">
                  Your message has been opened in WhatsApp. We will respond as soon as possible.
                </p>
                <button onClick={() => setSent(false)} className="btn-outline-gold text-sm">
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs text-brand-cream/60 uppercase tracking-wider mb-1 block">Full Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full bg-brand-black-3 border border-brand-gold/30 text-brand-cream placeholder-brand-cream/30 font-body text-sm px-4 py-3 rounded-none focus:outline-none focus:border-brand-gold-2"
                    />
                  </div>
                  <div>
                    <label className="font-body text-xs text-brand-cream/60 uppercase tracking-wider mb-1 block">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full bg-brand-black-3 border border-brand-gold/30 text-brand-cream placeholder-brand-cream/30 font-body text-sm px-4 py-3 rounded-none focus:outline-none focus:border-brand-gold-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-body text-xs text-brand-cream/60 uppercase tracking-wider mb-1 block">Subject *</label>
                  <input
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="What is this about?"
                    className="w-full bg-brand-black-3 border border-brand-gold/30 text-brand-cream placeholder-brand-cream/30 font-body text-sm px-4 py-3 rounded-none focus:outline-none focus:border-brand-gold-2"
                  />
                </div>
                <div>
                  <label className="font-body text-xs text-brand-cream/60 uppercase tracking-wider mb-1 block">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us how we can help..."
                    className="w-full bg-brand-black-3 border border-brand-gold/30 text-brand-cream placeholder-brand-cream/30 font-body text-sm px-4 py-3 rounded-none focus:outline-none focus:border-brand-gold-2 resize-none"
                  />
                </div>
                <button type="submit" className="btn-gold w-full">
                  Send via WhatsApp
                </button>
                <p className="font-body text-xs text-brand-cream/40 text-center">
                  This opens WhatsApp with your message pre-filled for the fastest response.
                </p>
              </form>
            )}
          </div>

          {/* FAQs */}
          <div>
            <h2 className="font-heading text-2xl text-brand-cream mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-brand-black-2 border border-brand-gold/10 rounded overflow-hidden">
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 font-body text-sm text-brand-cream hover:text-brand-gold-3 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-brand-gold-2 shrink-0">{open === i ? '−' : '+'}</span>
                  </button>
                  {open === i && (
                    <div className="px-5 pb-4">
                      <p className="font-body text-sm text-brand-cream/60 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-brand-gold/5 border border-brand-gold/20 rounded text-center">
              <p className="font-heading text-brand-cream mb-2">Still have questions?</p>
              <p className="font-body text-sm text-brand-cream/60 mb-4">Our team typically replies within 1 hour on WhatsApp.</p>
              <Link href="/custom-wigs" className="btn-outline-gold text-sm">
                Order a Custom Wig →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
