// src/app/layout.tsx
import type { Metadata } from "next"
import "../globals.css"
import LayoutWrapper from "@/components/reuse/LayoutWrapper"
import StoreProvider from '../store/storeProvider'

export const metadata: Metadata = {
  metadataBase: new URL("https://francis-online-store.com"),
  keywords: ["ecommerce", "online store", "shopping", "Francis"],
  authors: [{ name: "Francis", url: "https://francis-online-store.com" }],
  creator: "Francis",
  openGraph: {
    title: "Francis Online Store",
    description: "Your one-stop shop for all things delicious",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // <html lang="en">
    //   <body className={`font-poppins ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
     <StoreProvider>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        </StoreProvider>
    //   </body>
    // </html>
  )
}
