"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

const categories = [
  { id: "gameplay", name: "Gameplay", icon: "/placeholder.svg?height=50&width=50" },
  { id: "headphone", name: "Headphone", icon: "/placeholder.svg?height=50&width=50" },
  { id: "mobile", name: "Mobile", icon: "/placeholder.svg?height=50&width=50" },
  { id: "pendrive", name: "Pendrive", icon: "/placeholder.svg?height=50&width=50" },
  { id: "mouse", name: "Mouse", icon: "/placeholder.svg?height=50&width=50" },
]

interface ProductCategoriesProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export function ProductCategories({ selectedCategory, onCategoryChange }: ProductCategoriesProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "flex flex-col items-center p-4 rounded-lg bg-white hover:bg-gray-50 border",
            selectedCategory === category.id && "ring-2 ring-purple-500",
          )}
        >
          <Image
            src={category.icon || "/placeholder.svg"}
            alt={category.name}
            width={50}
            height={50}
            className="mb-2"
          />
          <span className="text-sm font-medium">{category.name}</span>
        </button>
      ))}
    </div>
  )
}

