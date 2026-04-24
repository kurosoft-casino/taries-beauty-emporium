'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'EN' | 'ZH'

export const translations = {
  EN: {
    // Nav
    shop: 'Shop',
    wigs: 'Wigs',
    bundles: 'Bundles',
    customWigs: 'Custom Wigs',
    maintenance: 'Hair Maintenance',
    beauty: 'Beauty',
    coats: 'Coats',
    homeAppliances: 'Home Appliances',
    kitchenware: 'Kitchenware',
    cleaning: 'Cleaning',
    bedding: 'Bedding',
    electronics: 'Electronics',
    about: 'About',
    vendors: 'Vendors',
    signIn: 'Sign In',
    // Header
    searchPlaceholder: 'Search wigs, bundles…',
    // Hero
    heroTag: 'Luxury Hair & Beauty — Ships from China to Nigeria & Ghana',
    heroTitle1: 'Where Beauty',
    heroTitle2: 'Meets Royalty',
    heroSubtitle: '100% authentic human hair wigs and bundles, custom-made with precision and shipped direct from our manufacturers in China to your door in Nigeria and Ghana.',
    shopNow: 'Shop The Collection',
    customOrder: 'Order Custom Wig',
    // General
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    viewAll: 'View All',
    loading: 'Loading…',
    // Cart
    cart: 'Cart',
    emptyCart: 'Your cart is empty',
    checkout: 'Checkout',
    // Vendors
    becomeVendor: 'Become a Vendor',
    vendorDashboard: 'Vendor Dashboard',
    // Footer
    shipping: 'Shipping',
    returns: 'Returns',
    contact: 'Contact',
    sizeGuide: 'Size Guide',
    wigCare: 'Wig Care',
    // Currency
    currency: 'Currency',
    language: 'Language',
  },
  ZH: {
    // Nav
    shop: '商店',
    wigs: '假发',
    bundles: '发束',
    customWigs: '定制假发',
    maintenance: '发品护理',
    beauty: '美妆',
    coats: '外套',
    homeAppliances: '家用电器',
    kitchenware: '厨具',
    cleaning: '清洁用品',
    bedding: '床上用品',
    electronics: '电子产品',
    about: '关于我们',
    vendors: '供应商',
    signIn: '登录',
    // Header
    searchPlaceholder: '搜索假发、发束…',
    // Hero
    heroTag: '奢华美发与美妆 —— 从中国直送尼日利亚和加纳',
    heroTitle1: '让美丽',
    heroTitle2: '尽显尊贵',
    heroSubtitle: '100% 真人发假发与发束，精致定制，直接从中国制造商发货，送达尼日利亚和加纳的您手中。',
    shopNow: '立即选购',
    customOrder: '定制专属假发',
    // General
    addToCart: '加入购物车',
    buyNow: '立即购买',
    viewAll: '查看全部',
    loading: '加载中…',
    // Cart
    cart: '购物车',
    emptyCart: '您的购物车是空的',
    checkout: '结账',
    // Vendors
    becomeVendor: '成为供应商',
    vendorDashboard: '供应商控制台',
    // Footer
    shipping: '运输',
    returns: '退货',
    contact: '联系我们',
    sizeGuide: '尺寸指南',
    wigCare: '假发护理',
    // Currency
    currency: '货币',
    language: '语言',
  },
} as const

export const categoryTranslations = {
  EN: {
    wigs: { label: 'Human Hair Wigs', description: 'Undetectable HD lace. 100% virgin human hair.' },
    bundles: { label: 'Hair Bundles', description: 'Virgin hair bundles in every texture.' },
    'custom-wigs': { label: 'Custom Wigs', description: 'Handcrafted to your exact specifications.' },
    maintenance: { label: 'Hair Maintenance', description: 'Professional care for your tresses.' },
    beauty: { label: 'Beauty Products', description: 'Celebrate your melanin. Glow differently.' },
    coats: { label: 'Female Coats', description: 'Elegance for every occasion.' },
    'home-appliances': { label: 'Home Appliances', description: 'Useful premium appliances for modern homes.' },
    kitchenware: { label: 'Kitchenware', description: 'Cookware and essentials for stylish kitchens.' },
    cleaning: { label: 'Cleaning Products', description: 'Home cleaning essentials with a polished finish.' },
    bedding: { label: 'Bedding', description: 'Bed linen and soft layers for luxury comfort.' },
    electronics: { label: 'Electronics', description: 'Beauty and lifestyle electronics for everyday use.' },
  },
  ZH: {
    wigs: { label: '真人发假发', description: '隐形 HD 蕾丝，100% 真人发。' },
    bundles: { label: '发束', description: '多种纹理可选的优质真人发束。' },
    'custom-wigs': { label: '定制假发', description: '按您的尺寸与需求手工定制。' },
    maintenance: { label: '发品护理', description: '专业级秀发护理产品。' },
    beauty: { label: '美妆产品', description: '为你的光彩增添更多自信。' },
    coats: { label: '女装外套', description: '适合每个场合的优雅造型。' },
    'home-appliances': { label: '家用电器', description: '适合现代家庭的实用优质电器。' },
    kitchenware: { label: '厨具', description: '为精致厨房准备的锅具与实用品。' },
    cleaning: { label: '清洁用品', description: '让家居保持洁净清新的日常用品。' },
    bedding: { label: '床上用品', description: '柔软舒适的床品与家居织物。' },
    electronics: { label: '电子产品', description: '适合美妆与生活场景的实用电子设备。' },
  },
} as const

export type TranslationKey = keyof typeof translations['EN']

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangContextValue>({
  lang: 'EN',
  setLang: () => {},
  t: (k) => translations.EN[k],
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('EN')

  useEffect(() => {
    const saved = localStorage.getItem('taries-lang') as Lang | null
    if (saved === 'ZH' || saved === 'EN') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('taries-lang', l)
  }

  function t(key: TranslationKey): string {
    return translations[lang][key]
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

export function getCategoryCopy(categoryId: string, lang: Lang) {
  return categoryTranslations[lang][categoryId as keyof typeof categoryTranslations.EN]
}
