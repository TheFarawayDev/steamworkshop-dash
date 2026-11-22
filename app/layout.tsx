import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { ServiceWorker } from "@/components/service-worker"
import { APP_DESCRIPTION, APP_NAME } from "@/lib/config"
import "./globals.css"

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: "Workshop",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Workshop" },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: "#14171d",
}

// Applies the saved/system theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem('theme')||'"system"');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#14171d':'#f5f7fa')}catch(_){document.documentElement.classList.add('dark')}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorker />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
