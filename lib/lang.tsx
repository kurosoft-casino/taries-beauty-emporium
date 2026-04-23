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
    about: 'About',
    vendors: 'Vendors',
    // Header
    searchPlaceholder: 'Search wigs, bundles…',
    // Hero
    heroTag: 'Direct from Guangzhou · Premium Quality',
    heroTitle1: 'Luxury Hair.',
    heroTitle2: 'Royal You.',
    heroSubtitle: '100% authentic human hair — sourced directly from top manufacturers in Guangzhou, China. No middlemen. Just pure luxury.',
    shopNow: 'Shop Now',
    customOrder: 'Custom Order',
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
    about: '关于我们',
    vendors: '供应商',
    // Header
    searchPlaceholder: '搜索假发、发束…',
    // Hero
    heroTag: '直发广州 · 顶级品质',
    heroTitle1: '奢华秀发。',
    heroTitle2: '皇者风范。',
    heroSubtitle: '100%真人发质——直接来自中国广州顶级制造商。无中间商，只有纯粹的奢华。',
    shopNow: '立即购买',
    customOrder: '定制订单',
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
