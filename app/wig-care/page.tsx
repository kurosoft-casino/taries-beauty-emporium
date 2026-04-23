import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Wig Care Guide',
  description: 'Expert tips on how to care for your 100% human hair wig from Taries Beauty Emporium. Keep your wig looking flawless.',
}

const careSections = [
  {
    icon: '🛁',
    title: 'Washing Your Wig',
    steps: [
      'Gently detangle with a wide-tooth comb before washing, starting from the ends and working up to the roots.',
      'Fill a basin with cool or lukewarm water — never hot water, as it damages the hair cuticle.',
      'Add a small amount of sulphate-free or moisturising shampoo designed for human hair.',
      'Gently swish the wig in the water. Do not scrub or wring the hair.',
      'Rinse thoroughly with cool running water until all shampoo is removed.',
      'Apply a deep conditioner or leave-in conditioner from mid-length to ends. Avoid the knots/wefts.',
      'Leave conditioner on for 5–15 minutes, then rinse with cool water.',
      'Gently press out excess water with a towel — do not rub or twist.',
    ],
    tip: 'Wash every 10–15 wears, or after heavy product use. Over-washing strips natural moisture.',
  },
  {
    icon: '💨',
    title: 'Drying Your Wig',
    steps: [
      'Place the wig on a wig stand or mannequin head after washing for best shape retention.',
      'Allow to air dry naturally at room temperature — this is the best method for longevity.',
      'If using a blow dryer, use the lowest heat setting and hold at least 6 inches from the hair.',
      'Avoid sleeping with a wet wig — this causes tangling and mould on the cap.',
      'Style only when fully dry to prevent heat damage and frizz.',
    ],
    tip: 'Air drying is always preferred. Natural air drying can extend the life of your wig by months.',
  },
  {
    icon: '💅',
    title: 'Styling & Heat',
    steps: [
      'Always apply a heat protectant spray before using any heat styling tools.',
      'Use a flat iron or curling iron at a maximum temperature of 180°C (356°F).',
      'Work in small sections for even, consistent styling.',
      'Allow hair to cool completely before brushing or combing after heat styling.',
      'For curly styles, use flexi-rods or pin curls overnight on a dry wig for heat-free curls.',
      'Avoid repeated heat styling in the same area to prevent dryness and breakage.',
    ],
    tip: 'Human hair can be coloured, permed, and styled just like natural hair — but do so sparingly to maintain quality.',
  },
  {
    icon: '🌙',
    title: 'Daily Care & Nighttime',
    steps: [
      'Gently detangle with a wide-tooth comb or wig brush before removing the wig.',
      'Store on a wig stand or in a silk bag when not wearing.',
      'If you prefer to sleep in your wig, braid or tie it loosely with a satin scarf or bonnet.',
      'Use a light leave-in conditioner spray for moisture and shine between washes.',
      'Avoid rubbing the wig against rough surfaces (car headrests, cotton pillowcases) — these cause frizz.',
    ],
    tip: 'A satin or silk pillowcase dramatically reduces friction and frizz if you sleep in your wig.',
  },
  {
    icon: '💧',
    title: 'Moisture & Products',
    steps: [
      'Use products specifically formulated for 100% human hair or colour-treated hair.',
      'Avoid products with sulphates, alcohols, or silicones that leave build-up.',
      'Apply hair oils (argan, coconut, or jojoba) lightly to the ends to prevent dryness.',
      'Deep condition monthly to maintain softness and shine.',
      'Avoid applying products directly to the lace or knots — this breaks down the lace over time.',
    ],
    tip: 'Less is more with product. Light applications regularly are better than heavy applications rarely.',
  },
  {
    icon: '📦',
    title: 'Storage',
    steps: [
      'Store your wig on a wig stand or mannequin head to maintain its shape.',
      'If storing long-term, place in a silk bag in a cool, dry place away from sunlight.',
      'Avoid storing in plastic bags — this causes moisture build-up and mould.',
      'Keep away from direct sunlight to prevent colour fading.',
      'Do not store with hair products on — clean before storing.',
    ],
    tip: 'Proper storage can significantly extend the life of your wig. A well-cared-for wig can last 1–3 years.',
  },
  {
    icon: '⚠️',
    title: 'What to Avoid',
    steps: [
      'Avoid swimming in chlorinated or salt water while wearing your wig.',
      'Do not use excessive heat — anything above 200°C will permanently damage human hair.',
      'Avoid harsh chemical treatments (bleaching) unless done by a professional.',
      'Never go to sleep with wet hair — always dry fully before sleeping in your wig.',
      'Avoid excessive brushing when dry — finger detangle first, then use a wide-tooth comb.',
    ],
    tip: null,
  },
]

export default function WigCarePage() {
  return (
    <div className="min-h-screen bg-brand-black">
      <div className="relative bg-brand-black-2 border-b border-brand-gold/20 py-20 text-center overflow-hidden">
        <div className="orb orb-gold w-96 h-96 -top-20 left-1/2 -translate-x-1/2 opacity-20" />
        <div className="relative z-10">
          <p className="font-body text-xs tracking-[0.4em] text-brand-gold-2 uppercase mb-4">Expert Tips</p>
          <h1 className="font-heading text-4xl md:text-5xl text-brand-cream mb-4">
            Wig Care <span className="gold-text">Guide</span>
          </h1>
          <p className="font-body text-brand-cream/60 max-w-xl mx-auto">
            Keep your 100% human hair wig looking flawless for longer with our expert care tips.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

        {/* Quick Reference */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {[
            { icon: '🧴', label: 'Wash', value: 'Every 10–15 wears' },
            { icon: '🌡️', label: 'Max Heat', value: '180°C / 356°F' },
            { icon: '💤', label: 'Sleep', value: 'Satin bonnet/scarf' },
            { icon: '📅', label: 'Deep Cond.', value: 'Monthly' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-brand-black-2 border border-brand-gold/10 rounded p-4 text-center">
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1">{label}</div>
              <div className="font-heading text-sm text-brand-cream">{value}</div>
            </div>
          ))}
        </div>

        {/* Care Sections */}
        <div className="space-y-8">
          {careSections.map((section) => (
            <div key={section.title} className="bg-brand-black-2 border border-brand-gold/10 rounded p-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{section.icon}</span>
                <h2 className="font-heading text-xl text-brand-cream">{section.title}</h2>
              </div>
              <ol className="space-y-3">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 font-body text-sm text-brand-cream/70 leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center text-brand-gold-2 text-xs font-bold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              {section.tip && (
                <div className="mt-5 flex gap-3 p-4 bg-brand-gold/5 border border-brand-gold/15 rounded">
                  <span className="text-base shrink-0">💡</span>
                  <p className="font-body text-xs text-brand-gold-3 leading-relaxed italic">{section.tip}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Products CTA */}
        <div className="mt-16 text-center bg-brand-black-2 border border-brand-gold/10 rounded p-10 space-y-4">
          <h3 className="font-heading text-2xl text-brand-cream">Shop Hair Maintenance Products</h3>
          <p className="font-body text-sm text-brand-cream/60">
            We stock all the products you need to keep your wig looking its best — from sulphate-free shampoos to heat protectants.
          </p>
          <Link href="/shop?category=maintenance" className="btn-gold inline-flex items-center gap-2">
            Shop Maintenance Products →
          </Link>
          <div className="pt-2">
            <a
              href="https://wa.me/2349035412919?text=Hi! I need advice on caring for my wig."
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm text-brand-gold-2 hover:text-brand-gold-3 underline underline-offset-4"
            >
              💬 Ask a Care Expert on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
