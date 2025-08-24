import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export interface MetricCardProps {
  title: string
  value: string
  link: string
  href: string
  change: string
  isPositive: boolean
}

/**
 * A metric display card component with title, value, and navigation link
 */
export function MetricCard({ 
  title, 
  value, 
  href, 
  change, 
  link, 
  isPositive 
}: MetricCardProps) {
  return (
    <Card className="shadow-md border-gray-200 bg-white text-card-foreground shadow-sm hover:">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {href ? (
          <Link href={href} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
            {link}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">
            {link}
          </span>
        )}
        {/* <p className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"} flex items-center mt-1`}>
          {isPositive ? "↑" : "↓"} {change} <span className="text-muted-foreground ml-1">in the last month</span>
        </p> */}
      </CardContent>
    </Card>
  )
}