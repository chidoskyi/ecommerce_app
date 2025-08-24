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



// "use client"

// import { useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { useRouter } from "next/navigation"

// export default function Dashboard() {
//   const router = useRouter()

//   useEffect(() => {
//     // Track dashboard view
//     console.log("Dashboard viewed")
//   }, [])

//   const handleLogout = () => {
//     // This will be replaced with actual logout when auth is implemented
//     console.log("Logout clicked")
//     router.push("/")
//   }

//   return (
//     <div className="flex min-h-screen flex-col">
//       <header className="border-b">
//         <div className="container flex h-16 items-center justify-between px-4">
//           <h1 className="text-lg font-bold">Admin Dashboard</h1>
//           <div className="flex items-center gap-4">
//             <span className="text-sm">Welcome, Admin</span>
//             <Button variant="outline" onClick={handleLogout}>
//               Logout
//             </Button>
//           </div>
//         </div>
//       </header>
//       <main className="flex-1 p-4 md:p-6">
//         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth="2"
//                 className="h-4 w-4 text-muted-foreground"
//               >
//                 <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
//               </svg>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">$45,231.89</div>
//               <p className="text-xs text-muted-foreground">+20.1% from last month</p>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth="2"
//                 className="h-4 w-4 text-muted-foreground"
//               >
//                 <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
//                 <circle cx="9" cy="7" r="4" />
//                 <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
//               </svg>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">+2350</div>
//               <p className="text-xs text-muted-foreground">+180.1% from last month</p>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium">Sales</CardTitle>
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth="2"
//                 className="h-4 w-4 text-muted-foreground"
//               >
//                 <rect width="20" height="14" x="2" y="5" rx="2" />
//                 <path d="M2 10h20" />
//               </svg>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">+12,234</div>
//               <p className="text-xs text-muted-foreground">+19% from last month</p>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between pb-2">
//               <CardTitle className="text-sm font-medium">Active Now</CardTitle>
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth="2"
//                 className="h-4 w-4 text-muted-foreground"
//               >
//                 <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
//               </svg>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">+573</div>
//               <p className="text-xs text-muted-foreground">+201 since last hour</p>
//             </CardContent>
//           </Card>
//         </div>
//       </main>
//     </div>
//   )
// }