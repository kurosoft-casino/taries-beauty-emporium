import type { Metadata } from 'next'
import { Playfair_Display, Poppins, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/components/layout/CartProvider'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/layout/CartDrawer'
import { Toaster } from 'react-hot-toast'

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
  title: 'Taries Beauty Emporium | Luxury Hair & Beauty',
  description: 'Premium 100% human hair wigs, bundles, custom wigs, hair maintenance & beauty products. Direct from manufacturers to Nigeria & Ghana.',
  keywords: 'human hair wigs, hair bundles, custom wigs, beauty products, Nigeria, Ghana',
  openGraph: {
    title: 'Taries Beauty Emporium',
    description: 'Luxury Hair & Beauty — Ships to Nigeria & Ghana',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable} ${cormorant.variable}`}>
      <body className="bg-brand-black font-body text-brand-cream antialiased">
        <CartProvider>
          <Header />
          <CartDrawer />
          <main>{children}</main>
          <Footer />
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
        </CartProvider>
      </body>
    </html>
  )
}
