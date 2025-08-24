import type { Metadata } from "next"
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ClerkProvider } from '@clerk/nextjs'
import { AuthProvider } from '@/context/AuthContext'
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://francis-online-store.com"),
  title: "Francis Online Store",
  description: "Your one-stop shop for all things delicious",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`font-poppins ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
          <main>
          <AuthProvider>
          {children}
          </AuthProvider>
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}