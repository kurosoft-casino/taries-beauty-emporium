'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, ArrowRight, ArrowLeft,
  MessageCircle, User, Building2, CreditCard, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentUser } from '@/lib/auth'
import { apiJson } from '@/lib/remoteApi'
import { isValidEmail, normalizeEmail, sanitizeInlineText, sanitizeMultilineText, sanitizePhone } from '@/lib/validation'

interface VendorForm {
  firstName:    string
  lastName:     string
  email:        string
  phone:        string
  businessName: string
  category:     string
  description:  string
}

const CATEGORIES = [
  'Hair & Wigs',
  'Beauty & Cosmetics',
  'Clothing & Fashion',
  'Accessories',
  'Other',
]

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center gap-2">
            <motion.div
              animate={active ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm transition-all duration-300 ${
                done
                  ? 'bg-brand-gold text-brand-black'
                  : active
                  ? 'bg-gold-gradient text-brand-black shadow-gold-xl ring-2 ring-brand-gold/30'
                  : 'bg-brand-black-3 border border-brand-gold/25 text-brand-cream/40'
              }`}
            >
              {done ? <CheckCircle2 className="w-5 h-5" /> : n}
            </motion.div>
            {i < total - 1 && (
              <div
                className={`w-14 h-px transition-all duration-500 ${
                  done ? 'bg-brand-gold' : 'bg-brand-gold/20'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({
  label, error, children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-brand-cream/55 text-xs uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
}

function Input({
  hasError, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      {...props}
      className={`w-full bg-brand-black-3 border rounded-xl px-4 py-3 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors ${
        hasError
          ? 'border-red-500 focus:border-red-500'
          : 'border-brand-gold/20 focus:border-brand-gold/50'
      }`}
    />
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VendorRegisterPage() {
  const [step, setStep]           = useState(1)
  const [form, setForm]           = useState<VendorForm>({
    firstName: '', lastName: '', email: '', phone: '',
    businessName: '', category: '', description: '',
  })
  const [agreed, setAgreed]       = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function update(k: keyof VendorForm, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!sanitizeInlineText(form.firstName)) e.firstName = 'First name is required'
    if (!sanitizeInlineText(form.lastName))  e.lastName  = 'Last name is required'
    if (!isValidEmail(form.email)) e.email = 'Valid email is required'
    if (!sanitizePhone(form.phone)) e.phone = 'Phone / WhatsApp number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    if (!sanitizeInlineText(form.businessName)) e.businessName = 'Business name is required'
    if (!form.category)            e.category     = 'Please select a category'
    if (sanitizeMultilineText(form.description).length < 20)
      e.description = 'Please write at least 20 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    if (!agreed) {
      setErrors({ agreed: 'You must agree to the terms before submitting' })
      return
    }

    const user = getCurrentUser()
    if (!user) {
      toast.error('Please sign in first, then submit your vendor application.')
      return
    }

    const email = normalizeEmail(form.email)
    if (normalizeEmail(user.email) !== email) {
      setErrors({ email: `Use your signed-in email (${user.email}) for this application.` })
      return
    }

    setSubmitting(true)
    try {
      await apiJson('/vendors/apply', {
        method: 'POST',
        body: JSON.stringify({
          brandName: sanitizeInlineText(form.category || form.businessName),
          businessName: sanitizeInlineText(form.businessName),
          displayName: sanitizeInlineText(form.businessName),
          bio: sanitizeMultilineText(form.description),
          phone: sanitizePhone(form.phone),
          ownerName: `${sanitizeInlineText(form.firstName)} ${sanitizeInlineText(form.lastName)}`,
        }),
      })
      setSubmitted(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit vendor application.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg w-full text-center"
        >
          <div className="w-24 h-24 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mx-auto mb-6 animate-pulse-gold">
            <CheckCircle2 className="w-12 h-12 text-brand-gold" />
          </div>
          <h1 className="text-3xl font-display font-bold gold-text mb-4">Application Submitted!</h1>
          <p className="text-brand-cream/65 mb-8 leading-relaxed text-base">
            {"We'll review your application within "}
            <strong className="text-brand-cream">24–48 hours</strong>.{' '}
            Please WhatsApp your payment receipt to{' '}
            <strong className="text-brand-gold">+234 903 541 2919</strong> to complete your registration.
          </p>

          <a
            href="https://wa.me/2349035412919?text=Hi%2C%20I%20just%20submitted%20my%20Taries%20vendor%20application.%20Please%20find%20my%20payment%20receipt%20attached."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center gap-2 mb-6"
          >
            <MessageCircle className="w-4 h-4" />
            Send Receipt on WhatsApp
          </a>

          <p className="text-brand-cream/30 text-xs">
            Include your business name in the WhatsApp message.
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const stepTitles = ['Personal Info', 'Business Info', 'Payment & Agreement']
  const StepIcons  = [User, Building2, CreditCard]
  const CurrentIcon = StepIcons[step - 1]

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        {/* Page heading */}
        <div className="text-center mb-8">
          <p className="section-label">Vendor Application</p>
          <h1 className="text-3xl font-display font-bold gold-text">Join As a Vendor</h1>
        </div>

        <StepIndicator step={step} total={3} />

        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-8 shadow-gold-xl">
          {/* Step header */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center">
              <CurrentIcon className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <p className="text-brand-cream/35 text-xs">Step {step} of 3</p>
              <h2 className="text-brand-cream font-display font-semibold">{stepTitles[step - 1]}</h2>
            </div>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            {/* ── Step 1 ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name" error={errors.firstName}>
                    <Input
                      value={form.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      placeholder="Jane"
                      hasError={!!errors.firstName}
                    />
                  </Field>
                  <Field label="Last Name" error={errors.lastName}>
                    <Input
                      value={form.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      placeholder="Smith"
                      hasError={!!errors.lastName}
                    />
                  </Field>
                </div>
                <Field label="Email Address" error={errors.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="jane@example.com"
                    hasError={!!errors.email}
                  />
                </Field>
                <Field label="Phone / WhatsApp" error={errors.phone}>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="+234 800 000 0000"
                    hasError={!!errors.phone}
                  />
                </Field>
              </motion.div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <Field label="Business Name" error={errors.businessName}>
                  <Input
                    value={form.businessName}
                    onChange={e => update('businessName', e.target.value)}
                    placeholder="Your Business Name"
                    hasError={!!errors.businessName}
                  />
                </Field>
                <Field label="Business Category" error={errors.category}>
                  <select
                    value={form.category}
                    onChange={e => update('category', e.target.value)}
                    className={`w-full bg-brand-black-3 border rounded-xl px-4 py-3 text-brand-cream text-sm focus:outline-none transition-colors ${
                      errors.category
                        ? 'border-red-500'
                        : 'border-brand-gold/20 focus:border-brand-gold/50'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Business Description" error={errors.description}>
                  <textarea
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    rows={4}
                    placeholder="Tell us about your business, products, and target customers… (min 20 chars)"
                    className={`w-full bg-brand-black-3 border rounded-xl px-4 py-3 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors resize-none ${
                      errors.description
                        ? 'border-red-500'
                        : 'border-brand-gold/20 focus:border-brand-gold/50'
                    }`}
                  />
                </Field>
              </motion.div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Fee box */}
                <div className="bg-gold-gradient rounded-2xl p-7 text-center shadow-gold-xl">
                  <p className="text-brand-black/60 text-xs uppercase tracking-[0.3em] mb-1">
                    One-Time Registration Fee
                  </p>
                  <div className="text-5xl font-display font-bold text-brand-black">$100</div>
                  <p className="text-brand-black/55 text-xs mt-1">Non-refundable</p>
                </div>

                {/* Payment instructions */}
                <div className="bg-brand-black-3 border border-brand-gold/20 rounded-xl p-5">
                  <p className="text-brand-gold font-semibold text-sm mb-2">Payment Instructions</p>
                  <p className="text-brand-cream/65 text-sm leading-relaxed">
                    Send <strong className="text-brand-gold">$100</strong> via bank transfer, then
                    WhatsApp your receipt to confirm payment:
                  </p>
                  <a
                    href="https://wa.me/2349035412919"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-brand-gold font-semibold text-sm hover:underline"
                  >
                    <MessageCircle className="w-4 h-4" />
                    +234 903 541 2919
                  </a>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => {
                      setAgreed(e.target.checked)
                      if (errors.agreed) setErrors(er => { const n = { ...er }; delete n.agreed; return n })
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-brand-gold/40 accent-brand-gold cursor-pointer flex-shrink-0"
                  />
                  <span className="text-brand-cream/60 text-sm leading-relaxed">
                    I agree to the Taries Beauty Emporium vendor terms and understand the{' '}
                    <strong className="text-brand-cream">$100 registration fee is non-refundable</strong>.
                    I will WhatsApp my payment receipt to complete registration.
                  </span>
                </label>
                {errors.agreed && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.agreed}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 text-brand-cream/50 hover:text-brand-gold transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <button onClick={handleNext} className="btn-gold flex items-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => { void handleSubmit() }} disabled={submitting} className="btn-gold flex items-center gap-2 disabled:opacity-70">
                {submitting ? 'Submitting...' : 'Submit Application'} <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
