import type { Metadata, Viewport } from "next"
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/context/AuthContext'
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://shopgrocery.org"),
  title: "Shop Grocery - Your Online Store",
  description: "Your one-stop shop for all things delicious",
  keywords: ["ecommerce", "online store", "shopping", "grocery", "food"],
  authors: [{ name: "Francis", url: "https://shopgrocery.org" }],
  creator: "Francis",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shop Grocery",
  },
  openGraph: {
    title: "Shop Grocery",
    description: "Your one-stop shop for all things delicious",
    url: "https://shopgrocery.org",
    siteName: "Shop Grocery",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: "#E1306C",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
      <head>
      <meta name="application-name" content="Shop Grocery" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Instagram" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="<Download /" />
      </head>
        <body className={`font-poppins ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
          <main>
          <AuthProvider>
          {children}
          </AuthProvider>
          <Analytics />
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}