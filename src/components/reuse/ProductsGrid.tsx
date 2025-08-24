"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const products = [
  {
    id: 1,
    name: '17" Screen Laptop',
    image: "/placeholder.svg?height=200&width=200",
    price: 899.99,
    originalPrice: 999.99,
    rating: 4.5,
    reviews: 12,
  },
  {
    id: 2,
    name: "Gaming Laptop",
    image: "/placeholder.svg?height=200&width=200",
    price: 1299.99,
    originalPrice: 1499.99,
    rating: 4.8,
    reviews: 24,
  },
  {
    id: 3,
    name: "Gaming Pad",
    image: "/placeholder.svg?height=200&width=200",
    price: 59.99,
    originalPrice: 79.99,
    rating: 4.2,
    reviews: 18,
  },
  {
    id: 4,
    name: "Portable Speaker",
    image: "/placeholder.svg?height=200&width=200",
    price: 129.99,
    originalPrice: 149.99,
    rating: 4.6,
    reviews: 32,
  },
  {
    id: 5,
    name: "Power Bank",
    image: "/placeholder.svg?height=200&width=200",
    price: 49.99,
    originalPrice: 69.99,
    rating: 4.3,
    reviews: 15,
  },
  {
    id: 6,
    name: "5G Phone",
    image: "/placeholder.svg?height=200&width=200",
    price: 699.99,
    originalPrice: 799.99,
    rating: 4.7,
    reviews: 42,
  },
  {
    id: 7,
    name: "Smart Camera",
    image: "/placeholder.svg?height=200&width=200",
    price: 399.99,
    originalPrice: 499.99,
    rating: 4.4,
    reviews: 28,
  },
  {
    id: 8,
    name: "Smart Tablet",
    image: "/placeholder.svg?height=200&width=200",
    price: 349.99,
    originalPrice: 399.99,
    rating: 4.5,
    reviews: 36,
  },
  {
    id: 9,
    name: "Smart Phone",
    image: "/placeholder.svg?height=200&width=200",
    price: 499.99,
    originalPrice: 599.99,
    rating: 4.9,
    reviews: 48,
  },
]

interface ProductGridProps {
  category: string
  filters: any
  sortBy: string
}

export function ProductGrid({ category, filters, sortBy }: ProductGridProps) {
  // Filter and sort products based on props
  let filteredProducts = [...products]

  // Apply category filter if not "all"
  if (category !== "all") {
    // This is a simplified example - in a real app, you'd have category data for each product
    filteredProducts = filteredProducts.filter((p) => (category === "gameplay" ? p.name.includes("Gaming") : true))
  }

  // Apply sorting
  if (sortBy === "price-low") {
    filteredProducts.sort((a, b) => a.price - b.price)
  } else if (sortBy === "price-high") {
    filteredProducts.sort((a, b) => b.price - a.price)
  } else if (sortBy === "alphabetically") {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name))
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredProducts.map((product) => (
        <Card key={product.id} className="group overflow-hidden">
          <CardContent className="p-4">
            <div className="relative">
              <Link href={`/products/${product.id}`}>
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  width={300}
                  height={300}
                  className="w-full h-48 object-contain mb-4 transition-transform group-hover:scale-105"
                />
              </Link>
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="icon" className="rounded-full bg-white h-8 w-8 mb-2">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full bg-white h-8 w-8">
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center mb-2">
              <div className="flex text-yellow-400">
                {Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <span key={i}>{i < Math.floor(product.rating) ? "★" : "☆"}</span>
                  ))}
              </div>
              <span className="ml-2 text-xs text-gray-600">({product.reviews})</span>
            </div>
            <Link href={`/products/${product.id}`}>
              <h3 className="text-sm font-medium hover:text-purple-600">{product.name}</h3>
            </Link>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-bold">Rs. {product.price}</span>
              <span className="text-xs text-gray-500 line-through">Rs. {product.originalPrice}</span>
            </div>
            <Button size="sm" className="w-full mt-3 bg-purple-600 hover:bg-purple-700">
              Add to cart
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

