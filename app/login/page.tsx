'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginUser, getCurrentUser } from '@/lib/auth'
import { normalizeEmail } from '@/lib/validation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getCurrentUser()) router.push('/account')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginUser(normalizeEmail(email), password)
      toast.success('Welcome back! 👑')
      router.push('/account')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-display text-3xl gold-text mb-2">Welcome Back</p>
          <p className="font-body text-sm text-brand-cream/60">Sign in to your Taries Beauty account</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-brand-black-2 border border-brand-gold/20 rounded-2xl p-6"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2"
            >
              <span className="text-red-400 text-sm">⚠️</span>
              <p className="font-body text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-body text-xs text-brand-gold-2 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-body text-xs text-brand-gold-2 uppercase tracking-wider">Password</label>
                <Link
                  href="/forgot-password"
                  className="font-body text-xs text-brand-gold/60 hover:text-brand-gold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-brand-black-3 border border-brand-gold/20 rounded-lg px-3 py-2.5 pr-10 font-body text-sm text-brand-cream placeholder-brand-cream/30 focus:outline-none focus:border-brand-gold transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold/50 hover:text-brand-gold transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => setRememberMe(v => !v)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  rememberMe ? 'bg-brand-gold border-brand-gold' : 'border-brand-gold/30 group-hover:border-brand-gold/60'
                }`}
              >
                {rememberMe && <span className="text-brand-black text-[10px]">✓</span>}
              </div>
              <span className="font-body text-sm text-brand-cream/60 group-hover:text-brand-cream/80 transition-colors">
                Remember me
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In 👑'}
            </button>
          </form>
        </motion.div>

        <p className="text-center font-body text-sm text-brand-cream/50 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-gold hover:text-brand-gold-3 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
