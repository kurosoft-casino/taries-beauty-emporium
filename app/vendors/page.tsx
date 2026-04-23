'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Globe, DollarSign, BarChart2, MessageCircle,
  Building2, Camera, Banknote, Phone, ArrowRight, ChevronRight,
} from 'lucide-react'

const benefits = [
  {
    icon: Globe,
    title: 'Reach Thousands of Buyers',
    desc: 'Sell to our growing audience of beauty & fashion shoppers across Nigeria and Ghana.',
  },
  {
    icon: DollarSign,
    title: 'Set Your Own Prices',
    desc: 'Full control over your pricing. Earn on every sale with transparent, reliable payouts.',
  },
  {
    icon: BarChart2,
    title: 'Vendor Analytics Dashboard',
    desc: 'Track views, orders and revenue with your own real-time analytics dashboard.',
  },
  {
    icon: MessageCircle,
    title: 'Dedicated WhatsApp Support',
    desc: 'Get real-time support from our team via WhatsApp whenever you need it.',
  },
]

const requirements = [
  { icon: Building2, text: 'Business registration documents' },
  { icon: Camera,    text: 'High-quality product photos' },
  { icon: Banknote,  text: 'Bank account details for payouts' },
  { icon: Phone,     text: 'Active WhatsApp contact number' },
]

const steps = [
  {
    num: '01',
    title: 'Register & Pay $100 Fee',
    desc: 'Complete the vendor registration form and submit your $100 non-refundable application fee via bank transfer.',
  },
  {
    num: '02',
    title: 'Admin Reviews Your Application',
    desc: 'Our team reviews your application within 24–48 hours and verifies your payment receipt via WhatsApp.',
  },
  {
    num: '03',
    title: 'Get Approved & Start Selling',
    desc: "Once approved, you'll receive access to your vendor dashboard and can start listing products immediately.",
  },
]

const FADE_UP_VIEWPORT = { once: true } as const

export default function VendorsPage() {
  return (
    <div className="min-h-screen bg-brand-black">
      {/* ── Hero ── */}
      <section className="relative pt-36 pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(212,175,55,0.10)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_100%,rgba(212,175,55,0.04)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="section-label"
          >
            Become a Vendor
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6 leading-tight"
          >
            <span className="gold-text">Join the Taries</span>
            <br />
            <span className="text-brand-cream">Beauty Marketplace</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-brand-cream/55 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Grow your beauty &amp; fashion business by selling directly to thousands of passionate shoppers across{' '}
            <span className="text-brand-gold">Nigeria</span> and <span className="text-brand-gold">Ghana</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/vendors/register" className="btn-gold inline-flex items-center gap-2">
              Apply Now <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works" className="btn-outline-gold inline-flex items-center gap-2">
              How It Works <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Floating stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-16 grid grid-cols-3 gap-6 max-w-sm mx-auto"
          >
            {[
              { value: '2+', label: 'Countries' },
              { value: '24h', label: 'Review time' },
              { value: '100%', label: 'Control' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-display font-bold gold-text">{s.value}</div>
                <div className="text-brand-cream/40 text-xs mt-0.5 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-20 px-4 bg-brand-black-2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-label">Benefits</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-cream">
              Why Sell With <span className="gold-text">Taries?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => {
              const Icon = b.icon
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={FADE_UP_VIEWPORT}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                  whileHover={{ y: -6 }}
                  className="bg-brand-black border border-brand-gold/20 rounded-2xl p-6 hover:border-brand-gold/50 transition-all duration-300 group cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center mb-5 group-hover:bg-brand-gold/20 transition-colors">
                    <Icon className="w-6 h-6 text-brand-gold" />
                  </div>
                  <h3 className="text-brand-cream font-display font-semibold mb-2 leading-snug">{b.title}</h3>
                  <p className="text-brand-cream/45 text-sm leading-relaxed">{b.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-label">What You Need</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-cream">
              Vendor <span className="gold-text">Requirements</span>
            </h2>
          </div>

          {/* $100 Fee highlight */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={FADE_UP_VIEWPORT}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-gold-gradient rounded-2xl p-10 mb-10 text-center shadow-gold-xl"
          >
            <p className="text-brand-black/60 font-body text-xs uppercase tracking-[0.3em] mb-2">
              One-Time Registration Fee
            </p>
            <div className="text-6xl font-display font-bold text-brand-black mb-3">$100</div>
            <p className="text-brand-black/65 max-w-md mx-auto text-sm leading-relaxed">
              A one-time, <strong>non-refundable</strong> registration fee is required to apply as a vendor.
              This covers application review, account setup, and personalised onboarding support.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requirements.map((r, i) => {
              const Icon = r.icon
              return (
                <motion.div
                  key={r.text}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={FADE_UP_VIEWPORT}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                  className="flex items-center gap-4 bg-brand-black-2 border border-brand-gold/20 rounded-xl p-5 hover:border-brand-gold/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-brand-gold" />
                  </div>
                  <span className="text-brand-cream/75 text-sm">{r.text}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 px-4 bg-brand-black-2">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-label">The Process</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-brand-cream">
              How It <span className="gold-text">Works</span>
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={FADE_UP_VIEWPORT}
                transition={{ delay: i * 0.15, duration: 0.5, ease: 'easeOut' }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center text-brand-black font-display font-bold text-lg shadow-gold-xl">
                  {s.num}
                </div>
                <div className="bg-brand-black border border-brand-gold/20 rounded-2xl p-6 flex-1 hover:border-brand-gold/40 transition-colors">
                  <h3 className="text-brand-gold font-display font-semibold text-lg mb-2">{s.title}</h3>
                  <p className="text-brand-cream/55 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-28 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={FADE_UP_VIEWPORT}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl mx-auto relative z-10"
        >
          <p className="section-label">Ready to grow?</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-cream mb-6 leading-tight">
            Start Selling <span className="gold-text">Today</span>
          </h2>
          <p className="text-brand-cream/45 mb-10 leading-relaxed text-lg">
            Join our marketplace and put your products in front of thousands of beauty shoppers.
            Applications are reviewed within 24 hours.
          </p>
          <Link
            href="/vendors/register"
            className="btn-gold inline-flex items-center gap-3 text-base !px-12 !py-4"
          >
            Apply Now — $100 Fee <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-brand-cream/25 text-xs mt-6">
            Questions? WhatsApp us at +234 903 541 2919
          </p>
        </motion.div>
      </section>
    </div>
  )
}
