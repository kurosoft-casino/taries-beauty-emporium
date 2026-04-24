'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { getCurrentUser, resetPasswordWithEmail } from '@/lib/auth'
import { getDialCode, getPhonePlaceholder, type SupportedCountry, withCountryDialCode } from '@/lib/phoneCountries'
import { normalizeEmail } from '@/lib/validation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<SupportedCountry>('Nigeria')
  const [phone, setPhone] = useState(`${getDialCode('Nigeria')} `)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getCurrentUser()) router.push('/account')
  }, [router])

  function handleCountryChange(nextCountry: SupportedCountry) {
    setCountry(nextCountry)
    setPhone(current => withCountryDialCode(current, nextCountry))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPasswordWithEmail(normalizeEmail(email), phone, password)
      toast.success('Password reset complete. Please sign in.')
      router.push('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-display text-3xl gold-text mb-2">Reset Password</p>
          <p className="font-body text-sm text-brand-cream/60">Confirm your account email and phone number to set a new password.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="font-body text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="jane@example.com"
              />
            </div>

            <div className="grid grid-cols-[140px,1fr] gap-3">
              <div>
                <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Country</label>
                <select
                  value={country}
                  onChange={e => handleCountryChange(e.target.value as SupportedCountry)}
                  className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream focus:outline-none focus:border-brand-gold transition-colors"
                >
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="China">China</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Registered Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                  placeholder={getPhonePlaceholder(country)}
                />
              </div>
            </div>

            <div>
              <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="Repeat the new password"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full btn-gold disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </motion.div>

        <p className="text-center font-body text-sm text-brand-cream/50 mt-6">
          Back to{' '}
          <Link href="/login" className="text-brand-gold hover:text-brand-gold-3 transition-colors">
            sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
