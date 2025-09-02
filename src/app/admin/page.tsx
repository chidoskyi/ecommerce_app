"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Package, ShoppingCart, Loader2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentProductsTable } from "@/components/dashboard/RecentOrdersTable";
import api from "@/lib/api";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        const response = await api.get("/api/admin/dashboard/metrics", {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, // Include cookies for authentication
        });

        // Axios response.data contains the JSON response
        const data: dashboardData = response.data;

        // Add icons to metrics
        const metricsWithIcons = data.metrics.map((metric) => {
          let icon;
          switch (metric.title) {
            case "Total Revenue":
              icon = DollarSign;
              break;
            case "Total Order":
              icon = ShoppingCart;
              break;
            case "Total Products":
              icon = Package;
              break;
            default:
              icon = DollarSign;
          }
          return { ...metric, icon };
        });

        setDashboardData({
          ...data,
          metrics: metricsWithIcons,
        });
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (error.response?.status === 401) {
          // Redirect to login if unauthorized
          router.push("/admin/login");
          return;
        }
        setError(
          error.response?.data?.message ||
            error.message ||
            "An unexpected error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  // Handle metric click navigation
  const handleMetricClick = (metric: any) => {
    if (metric.href) {
      router.push(metric.href);
    }

    // Track analytics
    console.log(`Metric clicked: ${metric.title}`);

    // Additional specific actions based on metric type
    if (metric.title === "Total Revenue") {
      trackRevenueClick();
    }
  };

  const trackRevenueClick = () => {
    console.log("Revenue metric interaction tracked");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-0 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading dashboard data...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-0 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              Error Loading Dashboard
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="p-0 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-600">
              No dashboard data available
            </h2>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, orders } = dashboardData;

  return (
    <div className="p-0 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {dashboardData.lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {metrics.map((metric: any, index: number) => (
          <div
            key={index}
            onClick={() => handleMetricClick(metric)}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <MetricCard
              title={metric.title}
              value={metric.value}
              change={metric.change}
              link={metric.link}
              href={metric.href}
              isPositive={metric.isPositive}
              icon={metric.icon}
            />
          </div>
        ))}
      </div>

      {/* Recent Products Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <h1 className="text-2xl font-bold mb-6">Recent Orders</h1>
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          {orders && orders.length > 0 ? (
            <RecentProductsTable orders={orders} />
          ) : (
            <div className="p-6 text-center text-gray-500">
              No recent products found
            </div>
          )}
        </div>
      </div>

      {/* Optional: Show comparison metadata */}
      {dashboardData.metadata && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Period: {dashboardData.metadata.period.replace("_", " ")}
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Revenue: {dashboardData.metadata.revenueComparison}</p>
            <p>Orders: {dashboardData.metadata.ordersComparison}</p>
          </div>
        </div>
      )}
    </div>
  );
}
