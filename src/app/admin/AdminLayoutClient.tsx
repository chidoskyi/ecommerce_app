// app/admin/AdminLayoutClient.tsx
"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "@/components/dashboard/AdminSidebar"
import { Search, Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { UserNav } from "@/components/dashboard/users/UserNav"
import { useClerk } from "@clerk/nextjs"

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()

  const handlePageChange = useCallback(
    (page: string) => {
      setSidebarOpen(false)
      router.push(`/admin/${page}`)
    },
    [router]
  )

  // const handleLogout = () => {
    //   router.push("/login")
    // }
    const handleLogout = async (): Promise<void> => {
      try {
        await signOut();
        router.push("/sign-in");
          console.log("Logout clicked")
    } catch (error) {
      console.error("❌ Error signing out:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          onNavigate={handlePageChange}
          currentPage={(pathname ?? "").split("/").pop() || "dashboard"}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4">
          <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          <div className="w-full flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search..."
                className="w-full bg-gray-50 flex-1 h-9 pl-9 pr-4 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <UserNav />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}
