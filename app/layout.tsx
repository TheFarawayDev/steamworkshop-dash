import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { ServiceWorker } from '@/components/service-worker'
import './globals.css'

export const metadata: Metadata = {
  title: 'TheFarawayDev — Workshop',
  description: 'Your published Steam Workshop mods, tagged by game, dated by post/update, with comments at a glance.',
  generator: 'v0.app',
  applicationName: 'Workshop',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Workshop',
  },
  icons: {
    icon: [
      {
        url: '/icon-512.png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#141414',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
