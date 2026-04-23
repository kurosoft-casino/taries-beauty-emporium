'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { registerUser, getCurrentUser } from '@/lib/auth'

const AVATARS = ['👸🏽', '💄', '👠', '💅', '🌹', '✨', '👒', '💋', '🌸', '👑', '🎀', '💎']

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: '', width: '0%' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%' }
  if (score === 2) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' }
  if (score === 3) return { label: 'Strong', color: 'bg-green-500', width: '75%' }
  return { label: 'Very Strong', color: 'bg-emerald-400', width: '100%' }
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  // Step 1
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})

  // Step 2
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({})

  // Step 3
  const [avatar, setAvatar] = useState('👑')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getCurrentUser()) router.push('/account')
  }, [router])

  function validateStep1() {
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = 'First name is required'
    if (!lastName.trim()) errs.lastName = 'Last name is required'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email is required'
    if (!phone.trim()) errs.phone = 'Phone number is required'
    setStep1Errors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2() {
    const errs: Record<string, string> = {}
    if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setStep2Errors(errs)
    return Object.keys(errs).length === 0
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setDirection(1)
    setStep(s => s + 1)
  }

  function goPrev() {
    setDirection(-1)
    setStep(s => s - 1)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        passwordHash: btoa(email.trim().toLowerCase() + ':' + password),
        avatar,
      })
      toast.success('Welcome to Taries Beauty! 👑')
      router.push('/account')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const strength = getPasswordStrength(password)

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-display text-3xl gold-text mb-2">Create Account</p>
          <p className="font-body text-sm text-brand-cream/60">Join the Taries Beauty family</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-body text-xs font-bold transition-all duration-300 ${
                s < step ? 'bg-brand-gold text-brand-black' :
                s === step ? 'bg-gold-gradient text-brand-black shadow-gold-xl' :
                'border border-brand-gold/30 text-brand-gold/50'
              }`}>
                {s < step ? <Check size={14} /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-px transition-all duration-300 ${s < step ? 'bg-brand-gold' : 'bg-brand-gold/20'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-16 mb-8">
          {['Personal Info', 'Password', 'Avatar'].map((label, i) => (
            <span key={label} className={`font-body text-[10px] uppercase tracking-widest transition-colors ${
              i + 1 === step ? 'text-brand-gold' : 'text-brand-cream/30'
            }`}>{label}</span>
          ))}
        </div>

        {/* Card */}
        <div className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6 overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2 className="font-heading text-xl text-brand-gold mb-6">Personal Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                        placeholder="Jane"
                      />
                      {step1Errors.firstName && <p className="text-red-400 text-xs mt-1">{step1Errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                        placeholder="Doe"
                      />
                      {step1Errors.lastName && <p className="text-red-400 text-xs mt-1">{step1Errors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                      placeholder="jane@example.com"
                    />
                    {step1Errors.email && <p className="text-red-400 text-xs mt-1">{step1Errors.email}</p>}
                  </div>
                  <div>
                    <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                      placeholder="+234 803 000 0000"
                    />
                    {step1Errors.phone && <p className="text-red-400 text-xs mt-1">{step1Errors.phone}</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2 className="font-heading text-xl text-brand-gold mb-6">Set Your Password</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 pr-10 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                        placeholder="Min. 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold/50 hover:text-brand-gold transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {step2Errors.password && <p className="text-red-400 text-xs mt-1">{step2Errors.password}</p>}
                    {password && (
                      <div className="mt-2">
                        <div className="w-full bg-brand-black-3 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${strength.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: strength.width }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className={`text-xs mt-1 font-body ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 pr-10 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold/50 hover:text-brand-gold transition-colors"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {step2Errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{step2Errors.confirmPassword}</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2 className="font-heading text-xl text-brand-gold mb-2">Choose Your Avatar</h2>
                <p className="font-body text-xs text-brand-cream/50 mb-6">Pick an emoji that represents you</p>
                <div className="grid grid-cols-6 gap-3">
                  {AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`text-2xl h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        avatar === emoji
                          ? 'bg-brand-gold/20 border-2 border-brand-gold shadow-gold-xl scale-110'
                          : 'bg-brand-black-3 border border-brand-gold/10 hover:border-brand-gold/40 hover:bg-brand-gold/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3 p-3 bg-brand-black-3 rounded-xl border border-brand-gold/10">
                  <span className="text-3xl">{avatar}</span>
                  <div>
                    <p className="font-heading text-sm text-brand-gold">{firstName} {lastName}</p>
                    <p className="font-body text-xs text-brand-cream/50">{email}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={goPrev}
                className="btn-outline-gold flex-1"
              >
                Previous
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="btn-gold flex-1"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-gold flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account 👑'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center font-body text-sm text-brand-cream/50 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-gold hover:text-brand-gold-3 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
