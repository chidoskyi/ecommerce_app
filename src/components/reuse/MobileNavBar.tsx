"use client";

import Link from "next/link"
import { Home, ShoppingCart, Heart, User, Package } from "lucide-react"
import { usePathname } from "next/navigation"

export default function MobileNavBar() {
  const pathname = usePathname()
  
  // Height should match the pb-16 in your layout (4rem = 16 * 0.25rem)
  const navHeight = "h-18" 
  
  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/carts", icon: ShoppingCart, label: "Cart" },
    { href: "/account/orders", icon: Package, label: "Orders" },
    { href: "/account/wishlist", icon: Heart, label: "Wishlist" },
    { href: "/account/profile", icon: User, label: "Account" },
  ]

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 backdrop-blur-md z-40 ${navHeight}`}>
      <div className="flex justify-around h-full">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 ${
                isActive ? "text-orange-600" : "text-gray-600"
              }`}
            >
              <Icon size={24} className={isActive ? "fill-current" : ""} />
              <span className="text-sm mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}