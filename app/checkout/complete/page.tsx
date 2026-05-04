'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, CircleX, Loader2 } from 'lucide-react'
import { withApiBase } from '@/lib/site'
import { useCartStore } from '@/lib/store'
import { clearAppliedCoupon } from '@/lib/coupons'

type VerifyResponse = {
  ok: boolean
  txRef: string
  paymentStatus: 'pending' | 'paid'
  verificationStatus: string
  error?: string
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-xl bg-brand-black-2 border border-brand-gold/20 p-8 text-center">
          <Loader2 className="w-10 h-10 text-brand-gold-2 animate-spin mx-auto mb-4" />
          <h1 className="font-heading text-2xl text-brand-cream mb-2">Loading</h1>
        </div>
      </div>
    }>
      <CheckoutCompleteInner />
    </Suspense>
  )
}

function CheckoutCompleteInner() {
  const params = useSearchParams()
  const { clearCart } = useCartStore()
  const [loading, setLoading] = useState(true)
  const [verify, setVerify] = useState<VerifyResponse | null>(null)

  const status = useMemo(() => (params.get('status') || '').toLowerCase(), [params])
  const txRef = useMemo(() => params.get('tx_ref') || '', [params])
  const transactionId = useMemo(() => params.get('transaction_id') || '', [params])

  useEffect(() => {
    async function run() {
      if (status !== 'successful' || !txRef) {
        setVerify({
          ok: false,
          txRef,
          paymentStatus: 'pending',
          verificationStatus: status || 'failed',
          error: 'Payment was not completed.',
        })
        setLoading(false)
        return
      }

      try {
        const verifyPath = withApiBase('/payments/flutterwave/verify')
        if (verifyPath === '/payments/flutterwave/verify') {
          setVerify({
            ok: false,
            txRef,
            paymentStatus: 'pending',
            verificationStatus: 'failed',
            error: 'Payment backend is not configured.',
          })
          setLoading(false)
          return
        }
        const url = new URL(verifyPath, window.location.origin)
        url.searchParams.set('tx_ref', txRef)
        if (transactionId) url.searchParams.set('transaction_id', transactionId)
        const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.ok) {
          setVerify({
            ok: false,
            txRef,
            paymentStatus: 'pending',
            verificationStatus: payload?.verificationStatus || 'failed',
            error: payload?.error || 'Payment verification failed.',
          })
          setLoading(false)
          return
        }
        setVerify(payload as VerifyResponse)
        clearCart()
        clearAppliedCoupon()
        sessionStorage.removeItem('taries-pending-order-id')
      } catch {
        setVerify({
          ok: false,
          txRef,
          paymentStatus: 'pending',
          verificationStatus: 'failed',
          error: 'Could not verify payment status. Please contact support with your order reference.',
        })
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [clearCart, status, transactionId, txRef])

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-xl bg-brand-black-2 border border-brand-gold/20 p-8 text-center">
        {loading ? (
          <>
            <Loader2 className="w-10 h-10 text-brand-gold-2 animate-spin mx-auto mb-4" />
            <h1 className="font-heading text-2xl text-brand-cream mb-2">Verifying Payment</h1>
            <p className="font-body text-sm text-brand-cream/60">Please wait while we confirm your payment with Flutterwave.</p>
          </>
        ) : verify?.ok ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h1 className="font-heading text-2xl text-brand-cream mb-2">Payment Confirmed</h1>
            <p className="font-body text-sm text-brand-cream/60 mb-6">
              Your payment was verified successfully. Reference: <span className="text-brand-gold-2">{verify.txRef}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/invoice?orderId=${encodeURIComponent(verify.txRef)}`} className="btn-gold">
                View Invoice
              </Link>
              <Link href="/shop" className="btn-outline-gold">
                Continue Shopping
              </Link>
            </div>
          </>
        ) : (
          <>
            <CircleX className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="font-heading text-2xl text-brand-cream mb-2">Payment Not Confirmed</h1>
            <p className="font-body text-sm text-brand-cream/60 mb-6">
              {verify?.error || 'We could not confirm your payment status yet.'}
              {verify?.txRef ? <> Reference: <span className="text-brand-gold-2">{verify.txRef}</span></> : null}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/checkout" className="btn-gold">
                Try Again
              </Link>
              <a
                href="https://wa.me/2349035412919"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline-gold"
              >
                Contact Support
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
