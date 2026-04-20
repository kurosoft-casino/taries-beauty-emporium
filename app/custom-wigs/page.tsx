'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const textures   = ['Straight', 'Body Wave', 'Deep Wave', 'Kinky Curly', 'Loose Curl', 'Water Wave', 'Afro Kinky', 'Yaki Straight']
const laceTypes  = ['HD Transparent Lace', 'Swiss Lace', 'Regular Lace']
const lengths    = ['10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"', '26"', '28"', '30"', '32"']
const densities  = ['130%', '150%', '180%', '200%', '250%']
const capSizes   = ['Small (21")', 'Medium (22")', 'Large (23")', 'XLarge (24")']
const colours    = ['Natural Black (1B)', 'Off Black (1)', 'Dark Brown (2)', 'Medium Brown (4)', 'Light Brown (6)', 'Honey Blonde (27)', 'Strawberry Blonde (30)', 'Platinum Blonde (613)', 'Burgundy (99J)', 'Ombre 1B/27', 'Ombre 1B/30', 'Ombre 1B/613', 'Custom (describe below)']
const wearStyles = ['Glueless (no adhesive)', 'Glue-down frontal', 'Full glue install']

export default function CustomWigsPage() {
  const [form, setForm] = useState({
    texture: '', lace: '', length: '', density: '', capSize: '', colour: '',
    wearStyle: '', notes: '', name: '', email: '', phone: '', country: 'Nigeria',
    budget: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [orderRef] = useState(() => 'TBE-CW-' + Math.random().toString(36).slice(2, 7).toUpperCase())

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.texture || !form.lace || !form.length || !form.density || !form.colour || !form.name || !form.email || !form.phone) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitted(true)
  }

  const waMessage = `Hi! I'd like to order a custom wig:\n- Texture: ${form.texture}\n- Lace: ${form.lace}\n- Length: ${form.length}\n- Density: ${form.density}\n- Colour: ${form.colour}\n- Cap: ${form.capSize}\n- Wear: ${form.wearStyle}\n- Notes: ${form.notes}\n\nName: ${form.name}\nEmail: ${form.email}`

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-black pt-32 pb-20 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-lg">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12 }}
            className="w-24 h-24 rounded-full bg-gold-gradient flex items-center justify-center mx-auto mb-6 shadow-gold-xl"
          >
            <Sparkles size={40} className="text-brand-black" />
          </motion.div>
          <h1 className="font-display text-4xl font-bold gold-text mb-3">Custom Order Received! ✨</h1>
          <p className="font-body text-brand-cream/60 mb-3">Your reference: <strong className="text-brand-gold-2">{orderRef}</strong></p>
          <p className="font-body text-sm text-brand-cream/50 mb-8">
            Our wig specialists will review your specifications and reach out within 24 hours via <strong className="text-brand-cream">{form.email}</strong> and WhatsApp to confirm details, pricing and timeline. Custom wigs take 14–21 days to craft.
          </p>
          <a
            href={`https://wa.me/+8613800138000?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center gap-2 mb-3"
          >
            <MessageCircle size={16} /> Chat on WhatsApp Now
          </a>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-brand-black-2 border-b border-brand-gold/20 mb-12">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section-label">✦ Bespoke Creation ✦</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-5xl md:text-6xl font-bold text-brand-cream mb-4">
            Your <span className="gold-text">Custom Wig</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="font-body text-brand-cream/50 max-w-xl mx-auto leading-relaxed">
            Every strand hand-tied with precision. Built to your exact measurements, specifications and vision. No two custom wigs are ever the same — because no two queens are the same.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap justify-center gap-4 mt-8">
            {['💎 Handcrafted', '📏 Your Measurements', '⏱️ 14–21 Days', '🌍 Ships to NG & GH'].map(b => (
              <span key={b} className="font-body text-xs tracking-wider text-brand-gold-2 border border-brand-gold/30 px-4 py-2">{b}</span>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Hair specs */}
          <Section title="01. Hair Specifications" icon="💎">
            <SelectGroup label="Hair Texture *" options={textures} value={form.texture} onChange={v => update('texture', v)} />
            <SelectGroup label="Lace Type *" options={laceTypes} value={form.lace} onChange={v => update('lace', v)} />
            <SelectGroup label="Length *" options={lengths} value={form.length} onChange={v => update('length', v)} />
            <SelectGroup label="Density *" options={densities} value={form.density} onChange={v => update('density', v)} />
            <SelectGroup label="Colour *" options={colours} value={form.colour} onChange={v => update('colour', v)} />
          </Section>

          {/* Fit & wear */}
          <Section title="02. Fit & Wear" icon="👑">
            <SelectGroup label="Cap Size" options={capSizes} value={form.capSize} onChange={v => update('capSize', v)} optional />
            <SelectGroup label="Wear Style" options={wearStyles} value={form.wearStyle} onChange={v => update('wearStyle', v)} optional />
            <div>
              <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-3">Additional Notes</label>
              <textarea
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                rows={4}
                placeholder="Head measurements, specific style references, colour swatch descriptions, any special requests..."
                className="w-full bg-brand-black border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2 resize-none placeholder-brand-cream/30"
              />
            </div>
          </Section>

          {/* Budget */}
          <Section title="03. Budget Range" icon="💰">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['Under $200', '$200–$300', '$300–$400', '$400–$500', '$500–$700', '$700+'].map(b => (
                <button key={b} type="button" onClick={() => update('budget', b)}
                  className={`px-4 py-3 font-body text-sm border transition-all duration-200 ${form.budget === b ? 'bg-gold-gradient text-brand-black border-transparent' : 'border-brand-gold/30 text-brand-cream/70 hover:border-brand-gold'}`}>
                  {b}
                </button>
              ))}
            </div>
          </Section>

          {/* Contact */}
          <Section title="04. Your Details" icon="📋">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Name *</label>
                <input required value={form.name} onChange={e => update('name', e.target.value)} className="w-full bg-brand-black border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2" />
              </div>
              <div>
                <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Email *</label>
                <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full bg-brand-black border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2" />
              </div>
            </div>
            <div>
              <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">WhatsApp Number *</label>
              <input required value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+234 or +233..." className="w-full bg-brand-black border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2" />
            </div>
            <div>
              <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Country</label>
              <div className="flex gap-3">
                {['Nigeria', 'Ghana', 'Other'].map(c => (
                  <button key={c} type="button" onClick={() => update('country', c)}
                    className={`flex-1 py-3 font-body text-sm border transition-all ${form.country === c ? 'bg-gold-gradient text-brand-black border-transparent' : 'border-brand-gold/30 text-brand-cream/70 hover:border-brand-gold'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Submit */}
          <div className="space-y-3">
            <button type="submit" className="btn-gold w-full py-4 text-base flex items-center justify-center gap-2">
              <Sparkles size={18} /> Submit Custom Wig Order
            </button>
            <a
              href={`https://wa.me/+8613800138000?text=${encodeURIComponent('Hi! I want to discuss a custom wig order.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all font-body text-sm font-semibold"
            >
              <MessageCircle size={16} /> Chat on WhatsApp Instead
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-brand-black-2 border border-brand-gold/20 p-6 md:p-8 space-y-5"
    >
      <h2 className="font-heading text-lg font-semibold text-brand-cream flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </motion.div>
  )
}

function SelectGroup({ label, options, value, onChange, optional }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; optional?: boolean
}) {
  return (
    <div>
      <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-3">
        {label} {optional && <span className="text-brand-cream/30">(optional)</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt === value ? '' : opt)}
            className={`px-3 py-1.5 text-xs font-body border transition-all duration-200 ${
              value === opt ? 'bg-gold-gradient text-brand-black border-transparent' : 'border-brand-gold/30 text-brand-cream/70 hover:border-brand-gold hover:text-brand-cream'
            }`}>
            {value === opt && <Check size={10} className="inline mr-1" />}{opt}
          </button>
        ))}
      </div>
    </div>
  )
}
