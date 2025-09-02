import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreHorizontal, ArrowUpIcon, ArrowDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MetricCardProps } from "@/types"

/**
 * A metric display card component with title, value, and navigation link
 */
export function MetricCard({
  title,
  value,
  change,
  href,
  link,
  isPositive,
  icon: Icon
}: MetricCardProps) {
  // Define colors based on metric type for icons
  const getIconColors = (title: string) => {
    switch (title) {
      case "Total Revenue":
        return { bg: "bg-green-100", text: "text-green-600" }
      case "Total Order":
        return { bg: "bg-blue-100", text: "text-blue-600" }
      case "Total Products":
        return { bg: "bg-purple-100", text: "text-purple-600" }
      default:
        return { bg: "bg-gray-100", text: "text-gray-600" }
    }
  }

  const iconColors = getIconColors(title)

  return (
    <Card className="shadow-md border-gray-200 bg-white text-card-foreground shadow-sm hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className={`flex items-center justify-center w-10 h-10 ${iconColors.bg} rounded-full`}>
              <Icon className={`w-5 h-5 ${iconColors.text}`} />
            </div>
          )}
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
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
        <div className="text-2xl font-bold mb-2">{value}</div>
        
        {/* Uncommented and improved change indicator */}
        {change && (
          <div className={`text-xs flex items-center mb-2 ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}>
            {isPositive ? (
              <ArrowUpIcon className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownIcon className="h-3 w-3 mr-1" />
            )}
            {change}
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        )}

        {href ? (
          <Link 
            href={href} 
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
          >
            {link} →
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">
            {link}
          </span>
        )}
      </CardContent>
    </Card>
  )
}