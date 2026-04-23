import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Size Guide',
  description: 'Find your perfect wig and hair size with the Taries Beauty Emporium comprehensive size guide.',
}

const capSizes = [
  { size: 'Petite', circumference: '20.5–21"', frontToNape: '13"', earToEar: '12"', napeToNape: '13.5"', typical: 'Small head circumference' },
  { size: 'Average (Most Common)', circumference: '21.5–22"', frontToNape: '13.5"', earToEar: '12.5"', napeToNape: '14.5"', typical: 'Fits ~85% of women' },
  { size: 'Large', circumference: '22.5–23"', frontToNape: '14"', earToEar: '13"', napeToNape: '15"', typical: 'Larger head circumference' },
]

const bundleLengths = [
  { length: '8"–10"', style: 'Bob / Pixie', description: 'Short styles, just below the ear to chin level' },
  { length: '12"–14"', style: 'Shoulder Length', description: 'Hits the shoulders; great for everyday wear' },
  { length: '16"–18"', style: 'Mid-Back', description: 'Popular all-rounder length' },
  { length: '20"–22"', style: 'Long', description: 'Below bra strap; glamorous everyday style' },
  { length: '24"–26"', style: 'Extra Long', description: 'Waist length; dramatic and luxurious' },
  { length: '28"–30"+', style: 'Super Long', description: 'Hip length and beyond; statement look' },
]

const densities = [
  { density: '130%', look: 'Natural', description: 'Mimics natural hair density; lightweight and breathable.' },
  { density: '150%', look: 'Full', description: 'The most popular choice; full and glamorous without being too heavy.' },
  { density: '180%', look: 'Extra Full', description: 'Very voluminous; ideal for special occasions and big looks.' },
  { density: '200%+', look: 'Ultra Voluminous', description: 'Maximum fullness; dramatic stage or event-ready style.' },
]

const measureSteps = [
  { step: 1, title: 'Front to Nape', desc: 'Place tape measure at your hairline above your forehead, over the top of your head to the nape of your neck.' },
  { step: 2, title: 'Ear to Ear (Forehead)', desc: 'Measure from the top of one ear, across your forehead, to the top of the other ear.' },
  { step: 3, title: 'Ear to Ear (Over Top)', desc: 'Measure from one ear, over the crown of your head, to the other ear.' },
  { step: 4, title: 'Temple to Temple (Back)', desc: 'Measure from one temple, around the back of your head, to the other temple.' },
  { step: 5, title: 'Nape of Neck', desc: 'Measure the width of the nape of your neck horizontally.' },
  { step: 6, title: 'Head Circumference', desc: 'Wrap tape around the full perimeter of your head, just above your ears and at the nape. This determines your cap size.' },
]

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen bg-brand-black">
      <div className="relative bg-brand-black-2 border-b border-brand-gold/20 py-20 text-center overflow-hidden">
        <div className="orb orb-gold w-96 h-96 -top-20 left-1/2 -translate-x-1/2 opacity-20" />
        <div className="relative z-10">
          <p className="font-body text-xs tracking-[0.4em] text-brand-gold-2 uppercase mb-4">Your Perfect Fit</p>
          <h1 className="font-heading text-4xl md:text-5xl text-brand-cream mb-4">
            Size <span className="gold-text">Guide</span>
          </h1>
          <p className="font-body text-brand-cream/60 max-w-xl mx-auto">
            Find your perfect wig cap size, bundle length, and density with our comprehensive guide.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-16">

        {/* How to Measure */}
        <section>
          <h2 className="font-heading text-2xl text-brand-cream mb-2">How to Measure Your Head</h2>
          <p className="font-body text-sm text-brand-cream/60 mb-8">Use a soft measuring tape. For best results, lay your natural hair flat or wear a wig cap liner before measuring.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {measureSteps.map(({ step, title, desc }) => (
              <div key={step} className="bg-brand-black-2 border border-brand-gold/10 rounded p-5 flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-brand-black font-heading font-bold text-sm shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="font-heading text-brand-cream text-sm mb-1">{title}</h3>
                  <p className="font-body text-xs text-brand-cream/60 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cap Sizes */}
        <section>
          <h2 className="font-heading text-2xl text-brand-cream mb-2">Wig Cap Sizes</h2>
          <p className="font-body text-sm text-brand-cream/60 mb-6">All measurements are approximate. Average cap size fits the vast majority of customers.</p>
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-brand-gold/30">
                  {['Cap Size', 'Circumference', 'Front–Nape', 'Ear–Ear', 'Nape–Nape', 'Best For'].map(h => (
                    <th key={h} className="text-left py-3 pr-4 text-brand-gold-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capSizes.map(row => (
                  <tr key={row.size} className="border-b border-brand-gold/5">
                    <td className="py-3 pr-4 text-brand-cream font-medium">{row.size}</td>
                    <td className="py-3 pr-4 text-brand-cream/70">{row.circumference}</td>
                    <td className="py-3 pr-4 text-brand-cream/70">{row.frontToNape}</td>
                    <td className="py-3 pr-4 text-brand-cream/70">{row.earToEar}</td>
                    <td className="py-3 pr-4 text-brand-cream/70">{row.napeToNape}</td>
                    <td className="py-3 text-brand-gold-3 text-xs">{row.typical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bundle Lengths */}
        <section>
          <h2 className="font-heading text-2xl text-brand-cream mb-2">Hair Bundle Lengths</h2>
          <p className="font-body text-sm text-brand-cream/60 mb-6">Lengths are measured in inches along the hair strand when straightened.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundleLengths.map(row => (
              <div key={row.length} className="bg-brand-black-2 border border-brand-gold/10 rounded p-5">
                <div className="font-heading text-2xl text-brand-gold-2 mb-1">{row.length}</div>
                <div className="font-heading text-sm text-brand-cream mb-2">{row.style}</div>
                <p className="font-body text-xs text-brand-cream/60">{row.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Density Guide */}
        <section>
          <h2 className="font-heading text-2xl text-brand-cream mb-2">Density Guide</h2>
          <p className="font-body text-sm text-brand-cream/60 mb-6">Density refers to the amount of hair on a wig or bundle. Higher density = more hair = more volume.</p>
          <div className="space-y-4">
            {densities.map(row => (
              <div key={row.density} className="bg-brand-black-2 border border-brand-gold/10 rounded p-5 flex items-start gap-5">
                <div className="shrink-0 text-center">
                  <div className="font-heading text-2xl text-brand-gold-2">{row.density}</div>
                  <div className="font-body text-xs text-brand-gold-3 mt-0.5">{row.look}</div>
                </div>
                <p className="font-body text-sm text-brand-cream/70 leading-relaxed pt-1">{row.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-8 space-y-4 bg-brand-black-2 border border-brand-gold/10 rounded p-10">
          <h3 className="font-heading text-2xl text-brand-cream">Not sure what size to order?</h3>
          <p className="font-body text-sm text-brand-cream/60">Chat with us and we&apos;ll help you choose the perfect size for your head shape and style goals.</p>
          <a
            href="https://wa.me/2349035412919?text=Hi! I need help choosing the right wig size."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center gap-2"
          >
            💬 Get Personal Advice
          </a>
          <div className="pt-2">
            <Link href="/custom-wigs" className="font-body text-sm text-brand-gold-2 hover:text-brand-gold-3 underline underline-offset-4">
              Order a Custom Wig →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
