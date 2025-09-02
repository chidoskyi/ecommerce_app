

// app/admin/layout.tsx (Simplified version that uses AdminLayoutInner)
"use client"
import StoreProvider from '@/app/store/storeProvider'
import AdminLayoutInner from '@/components/reuse/AdminLayoutInner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </StoreProvider>
  )
}