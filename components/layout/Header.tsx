'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Search, Menu, X, ChevronDown, Heart, User } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/products'
import { logoSrc } from '@/lib/assets'
import { getCategoryCopy, useLang } from '@/lib/lang'
import { getWishlist } from '@/lib/wishlist'
import { getCurrentUser, isAdminUser } from '@/lib/auth'
import type { User as AuthUser } from '@/lib/auth'
import { getProductHref, getStorefrontProducts, type StorefrontProduct } from '@/lib/catalog'
import { DEFAULT_STORE_SETTINGS, getStoreSettings, subscribeStoreSettings } from '@/lib/storeSettings'

export default function Header() {
  const [scrolled,      setScrolled]      = useState(false)
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [megaOpen,      setMegaOpen]      = useState(false)
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [wishlistCount, setWishlistCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [settings, setSettings] = useState(DEFAULT_STORE_SETTINGS)
  const [catalogProducts, setCatalogProducts] = useState<StorefrontProduct[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  const { getTotalItems, openCart, currency, setCurrency } = useCartStore()
  const { lang, setLang, t } = useLang()
  const totalItems = getTotalItems()
  const router = useRouter()
  const pathname = usePathname()
  const shopCategories = useMemo(() => [
    { icon: '👑', id: 'wigs', href: '/shop?category=wigs' },
    { icon: '✨', id: 'bundles', href: '/shop?category=bundles' },
    { icon: '💎', id: 'custom-wigs', href: '/shop?category=custom-wigs' },
    { icon: '🌿', id: 'maintenance', href: '/shop?category=maintenance' },
    { icon: '💄', id: 'beauty', href: '/shop?category=beauty' },
    { icon: '🧥', id: 'coats', href: '/shop?category=coats' },
    { icon: '🏠', id: 'home-appliances', href: '/shop?category=home-appliances' },
    { icon: '🍳', id: 'kitchenware', href: '/shop?category=kitchenware' },
    { icon: '🧼', id: 'cleaning', href: '/shop?category=cleaning' },
    { icon: '🛏️', id: 'bedding', href: '/shop?category=bedding' },
    { icon: '🔌', id: 'electronics', href: '/shop?category=electronics' },
  ], [])
  const navLinks = useMemo(() => [
    {
      label: t('shop'),
      href: '/shop',
      submenu: shopCategories.map(category => ({
        label: `${category.icon} ${getCategoryCopy(category.id, lang)?.label ?? category.id}`,
        href: category.href,
      })),
    },
    { label: t('customWigs'), href: '/custom-wigs' },
    { label: t('about'), href: '/about' },
    {
      label: t('vendors'),
      href: '/vendors',
      submenu: [
        { label: `🏪 ${t('becomeVendor')}`, href: '/vendors' },
        { label: lang === 'ZH' ? '📋 申请 / 注册' : '📋 Apply / Register', href: '/vendors/register' },
        { label: `📊 ${t('vendorDashboard')}`, href: '/vendors/dashboard' },
      ],
    },
  ], [lang, shopCategories, t])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return catalogProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    ).slice(0, 6)
  }, [catalogProducts, searchQuery])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 100)
  }, [searchOpen])

  useEffect(() => {
    setWishlistCount(getWishlist().length)
    const handleStorage = () => setWishlistCount(getWishlist().length)
    window.addEventListener('storage', handleStorage)
    const interval = setInterval(() => setWishlistCount(getWishlist().length), 1000)
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    setCurrentUser(getCurrentUser())
    const handleStorage = () => setCurrentUser(getCurrentUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const refresh = () => {
      setSettings(getStoreSettings())
      setCatalogProducts(getStorefrontProducts())
    }
    refresh()
    return subscribeStoreSettings(refresh)
  }, [])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'glass-dark py-3 shadow-gold' : 'bg-transparent py-5'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Top ticker bar */}
        <div className="bg-gold-gradient text-brand-black text-center py-1.5 text-xs font-body font-semibold tracking-widest uppercase overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee" style={{ width: 'max-content' }}>
            {Array(4).fill(null).map((_, i) => (
              <span key={i} className="mx-8">
                {lang === 'ZH'
                  ? '🌟 满 $200 免运费 • 从中国发货至尼日利亚和加纳 • 7–14 个工作日送达 • 100% 真人发品质保证'
                  : '🌟 Free shipping on orders over $200 • Ships from China to Nigeria & Ghana • 7–14 business days delivery • 100% Authentic Human Hair Guaranteed'}
                {settings.announcement ? ` • ${settings.announcement}` : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="relative w-12 h-12"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="Taries Beauty Emporium"
                className="w-full h-full object-contain rounded-full"
              />
            </motion.div>
            <div className="hidden sm:block">
              <p className="font-heading text-sm font-bold gold-text leading-tight tracking-wider">{settings.storeName.toUpperCase()}</p>
              <p className="font-body text-[9px] tracking-[0.4em] text-brand-gold-2 uppercase">Emporium</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <div key={link.label} className="relative group">
                {link.submenu ? (
                  <button
                    className="flex items-center gap-1 font-body text-sm font-medium text-brand-cream hover:text-brand-gold-3 transition-colors duration-300 tracking-wide"
                    onMouseEnter={() => setMegaOpen(true)}
                    onMouseLeave={() => setMegaOpen(false)}
                  >
                    {link.label}
                    <ChevronDown size={14} className="transition-transform duration-300 group-hover:rotate-180" />
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    className="relative font-body text-sm font-medium text-brand-cream hover:text-brand-gold-3 transition-colors duration-300 tracking-wide after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-gold-gradient after:transition-all after:duration-300 hover:after:w-full"
                  >
                    {link.label}
                  </Link>
                )}

                {/* Mega menu */}
                {link.submenu && (
                  <AnimatePresence>
                    {megaOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-3 glass-dark rounded-lg overflow-hidden min-w-[220px] shadow-gold-lg"
                        onMouseEnter={() => setMegaOpen(true)}
                        onMouseLeave={() => setMegaOpen(false)}
                      >
                        {link.submenu.map((item, i) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <Link
                              href={item.href}
                              className="block px-5 py-3 font-body text-sm text-brand-cream hover:bg-brand-gold/10 hover:text-brand-gold-3 transition-all duration-200 border-b border-brand-gold/10 last:border-0"
                              onClick={() => setMegaOpen(false)}
                            >
                              {item.label}
                            </Link>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Currency Selector */}
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as 'NGN' | 'GHS' | 'USD' | 'CNY')}
              className="hidden md:block bg-transparent border border-brand-gold/30 text-brand-gold-2 text-xs font-body px-2 py-1 rounded cursor-pointer focus:outline-none focus:border-brand-gold"
            >
              <option value="NGN" className="bg-brand-black-2">₦ NGN</option>
              <option value="GHS" className="bg-brand-black-2">GH₵ GHS</option>
              <option value="USD" className="bg-brand-black-2">$ USD</option>
              <option value="CNY" className="bg-brand-black-2">¥ CNY</option>
            </select>

            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'EN' ? 'ZH' : 'EN')}
              className="hidden md:flex items-center gap-1 bg-transparent border border-brand-gold/30 text-brand-gold-2 text-xs font-body px-2 py-1 rounded cursor-pointer hover:border-brand-gold transition-colors"
              title={lang === 'EN' ? '切换到中文' : 'Switch to English'}
            >
              {lang === 'EN' ? '🇨🇳 中文' : '🇬🇧 EN'}
            </button>

            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-brand-cream hover:text-brand-gold-3 transition-colors"
              aria-label={lang === 'ZH' ? '搜索' : 'Search'}
            >
              <Search size={20} />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative text-brand-cream hover:text-brand-gold-3 transition-colors"
              aria-label="Wishlist"
            >
              <Heart size={20} />
              <AnimatePresence>
                {wishlistCount > 0 && (
                  <motion.span
                    key={wishlistCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white font-body"
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Account */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {isAdminUser(currentUser) && (
                  <Link href="/admin" className="hidden md:inline-flex px-2 py-1 border border-brand-gold/40 text-brand-gold-2 text-[10px] font-body font-semibold uppercase tracking-wider hover:border-brand-gold hover:text-brand-gold-3 transition-colors">
                    Admin
                  </Link>
                )}
                <Link href="/account" className="flex items-center gap-1.5 text-brand-cream hover:text-brand-gold-3 transition-colors" title={`${currentUser.firstName} ${currentUser.lastName}`}>
                  <span className="text-lg leading-none">{currentUser.avatar || '👑'}</span>
                  <span className="hidden md:block font-body text-xs font-medium text-brand-gold-2 max-w-[80px] truncate">
                    {currentUser.firstName.slice(0, 10)}
                  </span>
                </Link>
              </div>
            ) : (
              <Link href="/login" className="hidden md:flex items-center gap-1 text-brand-cream hover:text-brand-gold-3 transition-colors" aria-label={t('signIn')}>
                <User size={20} />
                <span className="font-body text-xs font-medium">{t('signIn')}</span>
              </Link>
            )}

            {/* Cart */}
            <motion.button
              onClick={openCart}
              className="relative text-brand-cream hover:text-brand-gold-3 transition-colors"
              whileTap={{ scale: 0.9 }}
              aria-label="Cart"
            >
              <ShoppingBag size={22} />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gold-gradient flex items-center justify-center text-[10px] font-bold text-brand-black font-body"
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Mobile menu button */}
            <button
              className="lg:hidden text-brand-cream hover:text-brand-gold-3 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden glass-dark border-t border-brand-gold/20"
            >
              <div className="max-w-2xl mx-auto px-4 py-4">
                {/* Input row */}
                <div className="flex items-center gap-3">
                  <Search size={18} className="text-brand-gold-2 shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 bg-transparent text-brand-cream placeholder-brand-gold/40 font-body text-sm focus:outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        router.push(`/shop?search=${encodeURIComponent(searchQuery)}`)
                        setSearchOpen(false)
                        setSearchQuery('')
                      }
                      if (e.key === 'Escape') setSearchOpen(false)
                    }}
                  />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
                    <X size={18} className="text-brand-gold-2 hover:text-brand-gold-3" />
                  </button>
                </div>

                {/* Autocomplete dropdown */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="mt-2 border border-brand-gold/20 bg-brand-black divide-y divide-brand-gold/10"
                    >
                      {searchResults.map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            router.push(getProductHref(product))
                            setSearchOpen(false)
                            setSearchQuery('')
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-gold/5 transition-colors text-left"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-10 h-10 object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                             <p className="font-body text-sm text-brand-cream truncate">{product.name}</p>
                             <span className="inline-block text-[10px] font-body font-semibold text-brand-gold-2/70 uppercase tracking-wider">
                               {getCategoryCopy(product.category, lang)?.label ?? product.categoryLabel}
                             </span>
                           </div>
                          <span className="font-heading text-sm font-bold text-brand-gold-3 shrink-0">
                            {formatPrice(product.price, currency)}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          router.push(`/shop?search=${encodeURIComponent(searchQuery)}`)
                          setSearchOpen(false)
                          setSearchQuery('')
                        }}
                        className="w-full px-4 py-2.5 text-center font-body text-xs text-brand-gold-2 hover:text-brand-gold-3 transition-colors"
                      >
                        {lang === 'ZH' ? `查看“${searchQuery}”的全部结果 →` : `View all results for “${searchQuery}” →`}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 z-40 w-[min(320px,_calc(100vw-40px))] glass-dark flex flex-col pt-24 px-6 pb-8 overflow-y-auto"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link, i) => (
                <div key={link.label}>
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <Link
                      href={link.href}
                      className="block py-4 font-heading text-xl text-brand-cream hover:text-brand-gold-3 transition-colors border-b border-brand-gold/20"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                  {link.submenu && (
                    <div className="pl-4 py-2 flex flex-col gap-1">
                      {link.submenu.map(sub => (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          className="block py-2 font-body text-sm text-brand-gold/80 hover:text-brand-gold-3 transition-colors"
                          onClick={() => setMobileOpen(false)}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* Mobile: Account link */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Link
                  href={currentUser ? '/account' : '/login'}
                  className="block py-4 font-heading text-xl text-brand-cream hover:text-brand-gold-3 transition-colors border-b border-brand-gold/20"
                  onClick={() => setMobileOpen(false)}
                >
                  {currentUser ? `${currentUser.avatar || '👑'} ${currentUser.firstName}` : `👤 ${t('signIn')}`}
                </Link>
              </motion.div>
              {currentUser && isAdminUser(currentUser) && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.34 }}>
                  <Link
                    href="/admin"
                    className="block py-4 font-heading text-xl text-brand-gold hover:text-brand-gold-3 transition-colors border-b border-brand-gold/20"
                    onClick={() => setMobileOpen(false)}
                  >
                    🔐 Admin Dashboard
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Mobile currency */}
            <div className="mt-8">
              <p className="font-body text-xs tracking-widest text-brand-gold-2 uppercase mb-3">{t('currency')}</p>
              <div className="flex gap-2">
                {(['NGN', 'GHS', 'USD', 'CNY'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`flex-1 py-2 text-xs font-body font-semibold rounded border transition-all ${
                      currency === c
                        ? 'bg-gold-gradient text-brand-black border-transparent'
                        : 'border-brand-gold/30 text-brand-gold-2 hover:border-brand-gold'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Language Toggle */}
            <div className="mt-4">
              <p className="font-body text-xs tracking-widest text-brand-gold-2 uppercase mb-3">{t('language')} / 语言</p>
              <div className="flex gap-2">
                {(['EN', 'ZH'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-2 text-xs font-body font-semibold rounded border transition-all ${
                      lang === l
                        ? 'bg-gold-gradient text-brand-black border-transparent'
                        : 'border-brand-gold/30 text-brand-gold-2 hover:border-brand-gold'
                    }`}
                  >
                    {l === 'EN' ? '🇬🇧 English' : '🇨🇳 中文'}
                  </button>
                ))}
              </div>
            </div>

            <a
              href="https://wa.me/2349035412919"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 btn-gold text-center block"
            >
               {lang === 'ZH' ? '💬 WhatsApp 联系我们' : '💬 WhatsApp Us'}
             </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
