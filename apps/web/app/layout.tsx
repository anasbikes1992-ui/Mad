import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@madeenas/ui/src/styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'Madeenas Stock', template: '%s | Madeenas Stock' },
  description: 'Textile inventory and inter-location stock movement system for Madeenas Textiles',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
