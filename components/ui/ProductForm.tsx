'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import ImageUploader from '@/components/ui/ImageUploader'

export interface ProductFormData {
  name: string
  category: string
  price: string
  originalPrice: string
  shortDesc: string
  description: string
  images: string[]
  video: string
  inStock: boolean
  stockCount: string
  badge: string
  whatsapp: string
  features: string[]
  variants: { label: string; options: string; prices: string }[]
}

export function emptyFormData(): ProductFormData {
  return {
    name: '',
    category: '',
    price: '',
    originalPrice: '',
    shortDesc: '',
    description: '',
    images: [],
    video: '',
    inStock: true,
    stockCount: '',
    badge: '',
    whatsapp: '',
    features: [],
    variants: [],
  }
}

interface Props {
  initial?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => void
  onCancel: () => void
  submitLabel?: string
  loading?: boolean
}

const CATEGORIES = [
  'Hair & Wigs',
  'Bundles & Weaves',
  'Custom Wigs',
  'Hair Maintenance',
  'Beauty & Cosmetics',
  'Clothing & Fashion',
  'Accessories',
  'Other',
]

const BADGES = [
  { value: '', label: 'None' },
  { value: 'new', label: '🆕 New' },
  { value: 'sale', label: '🏷️ Sale' },
  { value: 'hot', label: '🔥 Hot' },
  { value: 'bestseller', label: '⭐ Bestseller' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-brand-gold/80 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
      <span className="flex-1 h-px bg-brand-gold/15" />
      {children}
      <span className="flex-1 h-px bg-brand-gold/15" />
    </h3>
  )
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="text-brand-cream/50 text-xs uppercase tracking-wider block mb-1.5">
      {children}
      {optional && <span className="normal-case ml-1 text-brand-cream/25">(optional)</span>}
    </label>
  )
}

const inputCls = (err?: string) =>
  `w-full bg-brand-black-3 border rounded-xl px-4 py-2.5 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none transition-colors ${
    err ? 'border-red-500 focus:border-red-500' : 'border-brand-gold/20 focus:border-brand-gold/50'
  }`

export default function ProductForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save Product',
  loading = false,
}: Props) {
  const [form, setForm] = useState<ProductFormData>({
    ...emptyFormData(),
    ...initial,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({})
  const [featureInput, setFeatureInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const err: Partial<Record<keyof ProductFormData, string>> = {}
    if (!form.name.trim()) err.name = 'Product name is required'
    if (!form.category) err.category = 'Please select a category'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      err.price = 'Valid price required'
    if (!form.description.trim()) err.description = 'Description is required'

    const invalidVariant = form.variants.find(variant => {
      if (!variant.label.trim() && !variant.options.trim() && !variant.prices.trim()) return false
      if (!variant.label.trim() || !variant.options.trim()) return true

      const optionCount = variant.options.split(',').map(option => option.trim()).filter(Boolean).length
      if (!optionCount) return true

      const priceEntries = variant.prices.split(',').map(price => price.trim())
      const filledPrices = priceEntries.filter(Boolean)
      if (!filledPrices.length) return false
      if (priceEntries.length > optionCount) return true

      return filledPrices.some(price => Number.isNaN(Number(price)) || Number(price) <= 0)
    })

    if (invalidVariant) {
      err.variants = 'Each variant needs a name, choices, and valid optional prices that match the choices.'
    }

    setErrors(err)
    return Object.keys(err).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  function addFeature() {
    const val = featureInput.trim()
    if (!val) return
    set('features', [...form.features, val])
    setFeatureInput('')
  }

  function removeFeature(idx: number) {
    set('features', form.features.filter((_, i) => i !== idx))
  }

  function addVariant() {
    set('variants', [...form.variants, { label: '', options: '', prices: '' }])
  }

  function updateVariant(idx: number, key: 'label' | 'options' | 'prices', value: string) {
    const updated = form.variants.map((v, i) => (i === idx ? { ...v, [key]: value } : v))
    set('variants', updated)
  }

  function removeVariant(idx: number) {
    set('variants', form.variants.filter((_, i) => i !== idx))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Section 1: Photos ── */}
      <div>
        <SectionTitle>Photos</SectionTitle>
        <ImageUploader
          images={form.images}
          onChange={imgs => set('images', imgs)}
          maxImages={5}
        />
        <p className="text-brand-cream/30 text-xs mt-2">First photo is your main product image</p>
      </div>

      {/* ── Section 2: Basic Info ── */}
      <div className="space-y-4">
        <SectionTitle>Basic Info</SectionTitle>

        <div>
          <FieldLabel>Product Name</FieldLabel>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Brazilian Body Wave Wig 18 inch"
            className={inputCls(errors.name)}
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className={inputCls(errors.category)}
          >
            <option value="">Select category…</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
        </div>

        <div>
          <FieldLabel optional>Short Description</FieldLabel>
          <input
            value={form.shortDesc}
            onChange={e => set('shortDesc', e.target.value)}
            placeholder="One-liner shown on product cards"
            maxLength={120}
            className={inputCls()}
          />
          <p className="text-brand-cream/25 text-xs mt-1">Shows on product cards · max 120 chars</p>
        </div>
      </div>

      {/* ── Section 3: Pricing & Stock ── */}
      <div className="space-y-4">
        <SectionTitle>Pricing &amp; Stock</SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Price (USD)</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0.00"
              className={inputCls(errors.price)}
            />
            {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
          </div>

          <div>
            <FieldLabel optional>Compare-at Price</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.originalPrice}
              onChange={e => set('originalPrice', e.target.value)}
              placeholder="Shows crossed out"
              className={inputCls()}
            />
          </div>
        </div>

        {/* In Stock toggle */}
        <div className="flex items-center justify-between p-4 bg-brand-black-3 rounded-xl border border-brand-gold/20">
          <div>
            <p className="text-brand-cream text-sm font-medium">In Stock</p>
            <p className="text-brand-cream/35 text-xs">Toggle availability for customers</p>
          </div>
          <button
            type="button"
            onClick={() => set('inStock', !form.inStock)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              form.inStock ? 'bg-green-500' : 'bg-brand-cream/20'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                form.inStock ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <AnimatePresence>
          {form.inStock && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <FieldLabel optional>Stock Count</FieldLabel>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stockCount}
                onChange={e => set('stockCount', e.target.value)}
                placeholder="Leave blank for unlimited"
                className={inputCls()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <FieldLabel optional>Badge</FieldLabel>
          <select
            value={form.badge}
            onChange={e => set('badge', e.target.value)}
            className={inputCls()}
          >
            {BADGES.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Section 4: Description ── */}
      <div>
        <SectionTitle>Description</SectionTitle>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={4}
          placeholder="Describe your product in detail — material, quality, benefits…"
          className={`${inputCls(errors.description)} resize-none`}
        />
        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* ── Section 5: Contact ── */}
      <div>
        <SectionTitle>Contact</SectionTitle>
        <FieldLabel optional>WhatsApp for Inquiries</FieldLabel>
        <input
          type="tel"
          value={form.whatsapp}
          onChange={e => set('whatsapp', e.target.value)}
          placeholder="+234 800 000 0000"
          className={inputCls()}
        />
      </div>

      {/* ── Section 6: Advanced (collapsed) ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 text-brand-cream/50 hover:text-brand-gold text-sm transition-colors w-full"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced Options
          <span className="flex-1 h-px bg-brand-gold/10" />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-5 pt-5">
                {/* Video URL */}
                <div>
                  <FieldLabel optional>Video URL (YouTube)</FieldLabel>
                  <input
                    type="url"
                    value={form.video}
                    onChange={e => set('video', e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                    className={inputCls()}
                  />
                </div>

                {/* Features tag input */}
                <div>
                  <FieldLabel optional>Features</FieldLabel>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={featureInput}
                      onChange={e => setFeatureInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); addFeature() }
                      }}
                      placeholder="Type a feature, press Enter"
                      className={inputCls()}
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="btn-gold !px-3 !py-2 flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {form.features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.features.map((f, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/25 text-brand-cream text-xs px-3 py-1.5 rounded-full"
                        >
                          {f}
                          <button
                            type="button"
                            onClick={() => removeFeature(i)}
                            className="text-brand-cream/40 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variants */}
                <div>
                  <FieldLabel optional>Variants</FieldLabel>
                  <p className="text-brand-cream/35 text-xs mb-3">
                    Example: variant name <span className="text-brand-cream/60">Length</span>, choices <span className="text-brand-cream/60">18 inch, 20 inch, 22 inch</span>, prices <span className="text-brand-cream/60">180, 210, 240</span>.
                  </p>
                  <div className="space-y-3">
                    {form.variants.map((v, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <div>
                            <FieldLabel>Variant Name</FieldLabel>
                            <input
                              value={v.label}
                              onChange={e => updateVariant(i, 'label', e.target.value)}
                              placeholder="e.g. Length"
                              className={inputCls(errors.variants)}
                            />
                          </div>
                          <div>
                            <FieldLabel>Choices</FieldLabel>
                            <input
                              value={v.options}
                              onChange={e => updateVariant(i, 'options', e.target.value)}
                              placeholder="18 inch, 20 inch, 22 inch"
                              className={inputCls(errors.variants)}
                            />
                          </div>
                          <div>
                            <FieldLabel optional>Option Prices (USD)</FieldLabel>
                            <input
                              value={v.prices}
                              onChange={e => updateVariant(i, 'prices', e.target.value)}
                              placeholder="180, 210, 240"
                              className={inputCls(errors.variants)}
                            />
                          </div>
                          <p className="text-brand-cream/25 text-xs">
                            Use the same order as the choices. Leave prices blank if the base product price already applies to every choice.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          className="mt-8 text-red-400/50 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {errors.variants && <p className="text-red-400 text-xs">{errors.variants}</p>}
                    <button
                      type="button"
                      onClick={addVariant}
                      className="btn-outline-gold !text-xs !py-2 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Variant
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 sticky bottom-0 sm:static bg-brand-black-2 sm:bg-transparent pt-4 pb-2 sm:pb-0 -mx-5 sm:mx-0 px-5 sm:px-0 border-t sm:border-0 border-brand-gold/15 z-10">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none py-3 px-6 border border-brand-gold/20 rounded-xl text-brand-cream/50 text-sm hover:border-brand-gold/40 hover:text-brand-cream/70 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 sm:flex-none btn-gold !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
