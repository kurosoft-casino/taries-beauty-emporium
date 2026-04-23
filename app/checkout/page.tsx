'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShoppingBag, CreditCard, Smartphone, Building2, ChevronRight, FileText, Plane, Package } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/products'
import { saveOrder } from '@/lib/orders'
import { estimateWeight, calcShipping, getCargoType } from '@/lib/shipping'

const steps = ['Cart', 'Details', 'Payment', 'Confirm']
const countries = ['Nigeria', 'Ghana']
const ngStates = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','FCT Abuja']
const ghRegions = ['Greater Accra','Ashanti','Western','Eastern','Central','Volta','Northern','Upper East','Upper West','Brong-Ahafo','Western North','Ahafo','Bono East','Oti','North East','Savannah']

export default function CheckoutPage() {
  const { items, getTotalUSD, currency, clearCart } = useCartStore()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    country: 'Nigeria', state: '', city: '', address: '', postalCode: '',
    notes: '',
    giftMessage: '',
    payMethod: 'card',
    cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '',
    bankRef: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [ordered, setOrdered] = useState(false)
  const [orderNum] = useState(() => 'TBE-' + Math.random().toString(36).slice(2, 8).toUpperCase())

  const total = getTotalUSD()
  const cargoType = getCargoType(items)
  const weightKg = estimateWeight(items)
  const shippingCalc = calcShipping(weightKg, cargoType)
  const shipping = items.length > 0 ? shippingCalc.totalUsdEquiv : 0
  const grandTotal = total + shipping

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName  = 'Required'
    if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = 'Valid email required'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.address.trim()) e.address = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.state) e.state = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    if (form.payMethod === 'card') {
      if (!form.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) e.cardNumber = 'Enter 16-digit card number'
      if (!form.cardName.trim()) e.cardName = 'Required'
      if (!form.cardExpiry.match(/^\d{2}\/\d{2}$/)) e.cardExpiry = 'Format: MM/YY'
      if (!form.cardCvv.match(/^\d{3,4}$/)) e.cardCvv = '3–4 digits'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  function handlePlaceOrder() {
    saveOrder({
      orderId: orderNum,
      date: new Date().toISOString(),
      status: 'pending',
      paymentStatus: form.payMethod === 'transfer' ? 'pending' : 'paid',
      paymentMethod: form.payMethod,
      currency,
      items,
      subtotalUSD: total,
      shippingUSD: shipping,
      grandTotalUSD: grandTotal,
      customer: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      },
      shipping: {
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        postalCode: form.postalCode,
      },
      notes: form.notes,
      giftMessage: form.giftMessage || undefined,
    })
    setOrdered(true)
    clearCart()
  }

  if (ordered) {
    return (
      <div className="min-h-screen bg-brand-black pt-32 pb-20 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-lg">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-gold-gradient flex items-center justify-center mx-auto mb-6 shadow-gold-xl"
          >
            <Check size={40} className="text-brand-black" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h1 className="font-display text-4xl font-bold gold-text mb-3">Order Placed! 🎉</h1>
            <p className="font-heading text-xl text-brand-cream mb-2">Thank you, {form.firstName}!</p>
            <p className="font-body text-sm text-brand-cream/50 mb-6">Your order <strong className="text-brand-gold-2">{orderNum}</strong> has been received. We'll send confirmation to <strong className="text-brand-gold-2">{form.email}</strong> and WhatsApp you a tracking number within 48 hours.</p>
            <div className="bg-brand-black-2 border border-brand-gold/20 p-5 mb-8 text-left space-y-2">
              <p className="font-body text-sm text-brand-cream/60">📦 Shipping to: <span className="text-brand-cream">{form.address}, {form.city}, {form.state}, {form.country}</span></p>
              <p className="font-body text-sm text-brand-cream/60">✈️ Estimated delivery: <span className="text-brand-cream">7–14 business days from Guangzhou</span></p>
              <p className="font-body text-sm text-brand-cream/60">💰 Total paid: <span className="text-brand-gold-3 font-bold">{formatPrice(grandTotal, currency)}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/invoice?orderId=${orderNum}`} className="btn-gold flex items-center gap-2 justify-center">
                <FileText size={16} /> View Invoice
              </Link>
              <Link href="/shop" className="btn-outline-gold">Continue Shopping</Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Steps bar */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-body transition-all duration-300 ${
                i + 1 < step ? 'bg-gold-gradient text-brand-black' :
                i + 1 === step ? 'bg-gold-gradient text-brand-black shadow-gold' :
                'border border-brand-gold/30 text-brand-cream/40'
              }`}>
                {i + 1 < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`font-body text-xs tracking-wider uppercase hidden sm:block ${i + 1 === step ? 'text-brand-gold-2' : 'text-brand-cream/30'}`}>{s}</span>
              {i < steps.length - 1 && <ChevronRight size={14} className="text-brand-gold/20 ml-1" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <h2 className="font-heading text-2xl text-brand-cream mb-6">Delivery Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([k, label]) => (
                      <div key={k}>
                        <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">{label}</label>
                        <input value={form[k as keyof typeof form]} onChange={e => update(k, e.target.value)}
                          className={`w-full bg-brand-black-2 border ${errors[k] ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                        {errors[k] && <p className="text-red-400 text-xs mt-1">{errors[k]}</p>}
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Email</label>
                    <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                      className={`w-full bg-brand-black-2 border ${errors.email ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Phone / WhatsApp</label>
                    <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+234 or +233..."
                      className={`w-full bg-brand-black-2 border ${errors.phone ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Country</label>
                    <select value={form.country} onChange={e => { update('country', e.target.value); update('state', '') }}
                      className="w-full bg-brand-black-2 border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2">
                      {countries.map(c => <option key={c} value={c} className="bg-brand-black-2">{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">
                        {form.country === 'Nigeria' ? 'State' : 'Region'}
                      </label>
                      <select value={form.state} onChange={e => update('state', e.target.value)}
                        className={`w-full bg-brand-black-2 border ${errors.state ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`}>
                        <option value="" className="bg-brand-black-2">Select...</option>
                        {(form.country === 'Nigeria' ? ngStates : ghRegions).map(s => (
                          <option key={s} value={s} className="bg-brand-black-2">{s}</option>
                        ))}
                      </select>
                      {errors.state && <p className="text-red-400 text-xs mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">City</label>
                      <input value={form.city} onChange={e => update('city', e.target.value)}
                        className={`w-full bg-brand-black-2 border ${errors.city ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                      {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Delivery Address</label>
                    <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street address, apartment, estate..."
                      className={`w-full bg-brand-black-2 border ${errors.address ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                    {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Order Notes (optional)</label>
                    <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Any special instructions..."
                      className="w-full bg-brand-black-2 border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2 resize-none" />
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">🎁 Gift Message (optional)</label>
                    <textarea
                      value={form.giftMessage}
                      onChange={e => { if (e.target.value.length <= 200) update('giftMessage', e.target.value) }}
                      rows={3}
                      placeholder="Write a personal message for the recipient..."
                      maxLength={200}
                      className="w-full bg-brand-black-2 border border-brand-gold/20 text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2 resize-none"
                    />
                    <p className="font-body text-xs text-brand-cream/30 text-right mt-1">{form.giftMessage.length}/200</p>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <h2 className="font-heading text-2xl text-brand-cream mb-6">Payment Method</h2>
                  {[
                    { id: 'card',     icon: CreditCard,    label: 'Debit / Credit Card',    sub: 'Visa, Mastercard via Paystack' },
                    { id: 'transfer', icon: Building2,     label: 'Bank Transfer',           sub: 'NGN / GHS direct bank transfer' },
                    { id: 'mobile',   icon: Smartphone,    label: 'Mobile Money',            sub: 'MTN, Airtel, Vodafone (Ghana)' },
                  ].map(method => (
                    <label key={method.id} className={`flex items-center gap-4 p-4 border cursor-pointer transition-all duration-200 ${form.payMethod === method.id ? 'border-brand-gold-2 bg-brand-gold/5' : 'border-brand-gold/20 hover:border-brand-gold/40'}`}>
                      <input type="radio" name="pay" value={method.id} checked={form.payMethod === method.id} onChange={e => update('payMethod', e.target.value)} className="hidden" />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${form.payMethod === method.id ? 'border-brand-gold-2' : 'border-brand-gold/30'}`}>
                        {form.payMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-gold-gradient" />}
                      </div>
                      <method.icon size={20} className="text-brand-gold-2 shrink-0" />
                      <div>
                        <p className="font-body text-sm font-semibold text-brand-cream">{method.label}</p>
                        <p className="font-body text-xs text-brand-cream/40">{method.sub}</p>
                      </div>
                    </label>
                  ))}

                  {form.payMethod === 'card' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                      <div>
                        <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Card Number</label>
                        <input value={form.cardNumber} onChange={e => update('cardNumber', e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())} maxLength={19} placeholder="0000 0000 0000 0000"
                          className={`w-full bg-brand-black-2 border ${errors.cardNumber ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2 tracking-widest`} />
                        {errors.cardNumber && <p className="text-red-400 text-xs mt-1">{errors.cardNumber}</p>}
                      </div>
                      <div>
                        <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Cardholder Name</label>
                        <input value={form.cardName} onChange={e => update('cardName', e.target.value)}
                          className={`w-full bg-brand-black-2 border ${errors.cardName ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                        {errors.cardName && <p className="text-red-400 text-xs mt-1">{errors.cardName}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">Expiry (MM/YY)</label>
                          <input value={form.cardExpiry} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 4); update('cardExpiry', v) }} maxLength={5} placeholder="MM/YY"
                            className={`w-full bg-brand-black-2 border ${errors.cardExpiry ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                          {errors.cardExpiry && <p className="text-red-400 text-xs mt-1">{errors.cardExpiry}</p>}
                        </div>
                        <div>
                          <label className="font-body text-xs tracking-widest text-brand-gold-2 uppercase block mb-2">CVV</label>
                          <input type="password" value={form.cardCvv} onChange={e => update('cardCvv', e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} placeholder="•••"
                            className={`w-full bg-brand-black-2 border ${errors.cardCvv ? 'border-red-500' : 'border-brand-gold/20'} text-brand-cream font-body text-sm px-4 py-3 focus:outline-none focus:border-brand-gold-2`} />
                          {errors.cardCvv && <p className="text-red-400 text-xs mt-1">{errors.cardCvv}</p>}
                        </div>
                      </div>
                      <p className="font-body text-xs text-brand-cream/30 flex items-center gap-1">🔒 Secured by Paystack SSL encryption</p>
                    </motion.div>
                  )}

                  {form.payMethod === 'transfer' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-brand-black-2 border border-brand-gold/20 space-y-2">
                      <p className="font-heading text-sm font-semibold text-brand-cream mb-3">Bank Transfer Details</p>
                      <p className="font-body text-sm text-brand-cream/70">Bank: <span className="text-brand-cream">Zenith Bank Nigeria / GCB Ghana</span></p>
                      <p className="font-body text-sm text-brand-cream/70">Account Name: <span className="text-brand-cream">Taries Beauty Emporium</span></p>
                      <p className="font-body text-sm text-brand-cream/70">Account No: <span className="text-brand-gold-3 font-bold">0123456789</span></p>
                      <p className="font-body text-xs text-brand-cream/40 pt-2">Use your order number <strong className="text-brand-gold-2">{orderNum}</strong> as payment reference. Your order will be processed after payment confirmation.</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-heading text-2xl text-brand-cream mb-6">Review Your Order</h2>
                  <div className="space-y-4 mb-6">
                    {items.map(item => (
                      <div key={item.product.id} className="flex items-center gap-4 p-3 bg-brand-black-2 border border-brand-gold/10">
                        <div className="relative w-16 h-16 shrink-0">
                          <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="font-body text-sm text-brand-cream">{item.product.name}</p>
                          <p className="font-body text-xs text-brand-cream/40">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-heading text-sm font-bold text-brand-gold-2">{formatPrice(item.product.price * item.quantity, currency)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-brand-black-2 border border-brand-gold/20 space-y-2 mb-6">
                    <p className="font-body text-sm text-brand-cream/60">📍 <span className="text-brand-cream">{form.firstName} {form.lastName}</span></p>
                    <p className="font-body text-sm text-brand-cream/60">{form.address}, {form.city}, {form.state}, {form.country}</p>
                    <p className="font-body text-sm text-brand-cream/60">📧 {form.email} · 📞 {form.phone}</p>
                    <p className="font-body text-sm text-brand-cream/60">💳 {form.payMethod === 'card' ? 'Credit/Debit Card' : form.payMethod === 'transfer' ? 'Bank Transfer' : 'Mobile Money'}</p>
                  </div>
                  <button onClick={handlePlaceOrder} className="btn-gold w-full py-4 text-base flex items-center justify-center gap-2">
                    <Check size={18} /> Place Order · {formatPrice(grandTotal, currency)}
                  </button>
                  <p className="font-body text-xs text-brand-cream/30 text-center mt-3">By placing this order you agree to our Terms & Conditions.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {step < 3 && (
              <div className="flex gap-3 mt-8">
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)} className="btn-outline-gold">← Back</button>
                )}
                <button onClick={handleNext} className="btn-gold flex-1 flex items-center justify-center gap-2">
                  {step === 1 ? 'Continue to Payment' : 'Review Order'} <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-brand-black-2 border border-brand-gold/20 p-5 sticky top-28">
              <h3 className="font-heading text-base font-semibold text-brand-cream mb-4 pb-3 border-b border-brand-gold/20">Order Summary</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto scrollbar-hide">
                {items.map(item => (
                  <div key={item.product.id} className="flex justify-between text-xs font-body">
                    <span className="text-brand-cream/60 flex-1 pr-2">{item.product.name} ×{item.quantity}</span>
                    <span className="text-brand-cream shrink-0">{formatPrice(item.product.price * item.quantity, currency)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-brand-gold/20 pt-3 space-y-2">
                <div className="flex justify-between font-body text-sm">
                  <span className="text-brand-cream/60">Subtotal</span>
                  <span className="text-brand-cream">{formatPrice(total, currency)}</span>
                </div>
                {/* Real shipping breakdown */}
                <div className="p-3 bg-brand-black-3 border border-brand-gold/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Plane size={12} className="text-brand-gold-2" />
                    <span className="font-body text-xs text-brand-gold-2 font-semibold">Shipping from Guangzhou, China</span>
                  </div>
                  <p className="font-body text-xs text-brand-cream/50">
                    Estimated weight: {weightKg.toFixed(1)} kg{weightKg === 10 ? ' (minimum 10 kg)' : ''}
                  </p>
                  <p className="font-body text-xs text-brand-cream/50">
                    {cargoType === 'sensitive' ? '⚗️ Sensitive goods' : '📦 General cargo'}
                  </p>
                  <p className="font-body text-xs text-brand-cream/50">
                    ${shippingCalc.usd.toFixed(2)} USD + ₦{shippingCalc.ngn.toLocaleString()} NGN
                  </p>
                  <div className="flex justify-between font-body text-sm pt-1 border-t border-brand-gold/10">
                    <span className="text-brand-cream/60">Shipping</span>
                    <span className="text-brand-cream">{formatPrice(shipping, currency)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-heading font-bold pt-2 border-t border-brand-gold/20">
                  <span className="text-brand-cream">Total</span>
                  <span className="gold-text text-lg">{formatPrice(grandTotal, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
