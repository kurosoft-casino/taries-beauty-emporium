import type { Metadata } from 'next'
import { Playfair_Display, Poppins, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/components/layout/CartProvider'
import { LangProvider } from '@/lib/lang'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/layout/CartDrawer'
import FirstTimeBuyerBanner from '@/components/ui/FirstTimeBuyerBanner'
import ChatWidget from '@/components/ui/ChatWidget'
import CookieConsent from '@/components/ui/CookieConsent'
import ExitIntentPopup from '@/components/ui/ExitIntentPopup'
import SiteRuntime from '@/components/ui/SiteRuntime'
import { Toaster } from 'react-hot-toast'
import { SITE_URL, withBasePath } from '@/lib/site'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Taries Beauty Emporium | Luxury Hair & Beauty',
    template: '%s | Taries Beauty Emporium',
  },
  description: 'Premium 100% human hair wigs, bundles, custom wigs, hair maintenance & beauty products. Direct from manufacturers in Guangzhou, China to Nigeria, Ghana and across Africa.',
  keywords: ['human hair wigs', 'hair bundles', 'custom wigs', 'beauty products', 'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Africa', 'luxury hair', 'Taries Beauty'],
  authors: [{ name: 'Taries Beauty Emporium' }],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Taries Beauty Emporium | Luxury Hair & Beauty',
    description: 'Premium 100% human hair wigs, bundles, custom wigs & beauty products. Direct from Guangzhou, China — shipped across Africa.',
    type: 'website',
    url: SITE_URL,
    siteName: 'Taries Beauty Emporium',
    images: [{ url: withBasePath('/images/logo.jpg'), width: 800, height: 600, alt: 'Taries Beauty Emporium' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taries Beauty Emporium | Luxury Hair & Beauty',
    description: 'Premium human hair wigs, bundles & beauty products shipped across Africa.',
    images: [withBasePath('/images/logo.jpg')],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable} ${cormorant.variable}`}>
      <head>
        <link rel="manifest" href={withBasePath('/manifest.json')} />
        <meta name="theme-color" content="#D4AF37" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Taries Beauty" />
        <link rel="apple-touch-icon" href={withBasePath('/images/icon-192.png')} />
      </head>
      <body id="top" className="bg-brand-black font-body text-brand-cream antialiased overflow-x-hidden min-h-screen">
        <LangProvider>
        <CartProvider>
          <Header />
          <CartDrawer />
          <main className="relative z-0">{children}</main>
          <Footer />
          <FirstTimeBuyerBanner />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#D4AF37',
                border: '1px solid #C9960C',
                fontFamily: 'var(--font-poppins)',
              },
              success: { iconTheme: { primary: '#D4AF37', secondary: '#0A0A0A' } },
            }}
          />
          <ChatWidget />
          <CookieConsent />
          <ExitIntentPopup />
          <SiteRuntime />
        </CartProvider>
        </LangProvider>
      </body>
    </html>
  )
}
