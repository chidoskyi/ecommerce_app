"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
// import { SalesLocationMap } from "@/components/sales-location-map"
// import { SalesChannelChart } from "@/components/sales-channel-chart"
// import { ProductsTable } from "@/components/products-table"
// import { MonthlyTarget } from "@/components/monthly-target"
import { dashboardData } from "../../data/data"
import { RecentProductsTable } from "@/components/dashboard/RecentProductsTable"
// import { useAnalytics, event } from "@/hooks/use-analytics"

export default function Dashboard() {
  const { metrics, products } = dashboardData

  // Use the analytics hook
  // useAnalytics()
  const router = useRouter()

  useEffect(() => {
    // Track dashboard view
    console.log("Dashboard viewed")
  }, [])

  

  // const handleLogout = () => {
  //   // This will be replaced with actual logout when auth is implemented
  //   console.log("Logout clicked")
  //   router.push("/")
  // }

  return (
    <div className="p-0 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Admin dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 ">
          {metrics.map((metric, index) => (
          <div key={index} onClick={() => handleMetricClick(metric.title)}>
            <MetricCard
              title={metric.title}
              value={metric.value}
              change={metric.change}
              isPositive={metric.isPositive}
            />
          </div>
        ))}
        
      </div>

      {/* Charts */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <RevenueChart data={revenueData} />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <SalesLocationMap data={salesByLocation} />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <SalesChannelChart data={totalSalesData} />
        </div>
      </div> */}

      {/* Table and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <h1 className="text-2xl font-bold mb-6">Recent Orders</h1>
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <RecentProductsTable products={products}  />
        </div>
        {/* <div className="bg-white rounded-lg shadow">
          <MonthlyTarget data={progressData} />
        </div> */}
      </div>
    </div>
  )
}
