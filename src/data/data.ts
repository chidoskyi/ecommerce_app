
export const dashboardData = {
  metrics: [
    { title: "Total Revenue", value: "$34,456.00", change: "14%", isPositive: true, link: "Manage Orders", href: "/admin/customer" },
    { title: "Total Order", value: "3456", change: "17%", isPositive: false, link: "Manage Orders", href: "/admin/orders" },
    { title: "Total Products", value: "$1,456.00", change: "14%", isPositive: true, link: "Manage Products", href: "/admin/products" },
    // { title: "Total Customer", value: "42,456", change: "11%", isPositive: false, link: "" },
  ],

  revenueData: [
    { month: "Jan", current: 10, previous: 8 },
    { month: "Feb", current: 15, previous: 12 },
    { month: "Mar", current: 20, previous: 18 },
    { month: "Apr", current: 25, previous: 22 },
    { month: "May", current: 30, previous: 28 },
    { month: "Jun", current: 35, previous: 32 },
  ],

  salesByLocation: [
    { city: "New York", value: 27000 },
    { city: "San Francisco", value: 19000 },
    { city: "Sydney", value: 25000 },
    { city: "Singapore", value: 61000 },
  ],

  totalSalesData: [
    { name: "Direct", value: 300.56 },
    { name: "Affiliate", value: 135.18 },
    { name: "Sponsored", value: 154.02 },
    { name: "E-mail", value: 48.96 },
  ],

  products: [
    { name: "Shirt", price: 78.69, category: "Man Cloths", quantity: 128, amount: 6471.5 },
    { name: "T-Shirt", price: 79.8, category: "Women Cloths", quantity: 89, amount: 6471.5 },
    { name: "Pant", price: 86.65, category: "Kid Cloths", quantity: 74, amount: 6471.5 },
    { name: "Sweater", price: 56.07, category: "Man Cloths", quantity: 69, amount: 6471.5 },
    { name: "Light Jacket", price: 36.0, category: "Women Cloths", quantity: 65, amount: 6471.5 },
    { name: "Half Shirt", price: 67.78, category: "Man Cloths", quantity: 58, amount: 6471.5 },
  ],

  progressData: {
    percentage: 75.34,
    earnings: "$3,267",
    target: "$25K",
    revenue: "$18K",
    today: "$1.8K",
  },

  invoiceData: [
    { id: 1, customerName: "John Doe", amount: 1500.0, date: "2025-03-15", status: "Paid" },
    { id: 2, customerName: "Jane Smith", amount: 2000.5, date: "2025-03-16", status: "Pending" },
    { id: 3, customerName: "Bob Johnson", amount: 1750.75, date: "2025-03-17", status: "Overdue" },
    { id: 4, customerName: "Alice Brown", amount: 3000.0, date: "2025-03-18", status: "Paid" },
    { id: 5, customerName: "Charlie Davis", amount: 1250.25, date: "2025-03-19", status: "Pending" },
  ],
}

