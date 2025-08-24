export const getStatusBadgeColor= ( status: string ) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      case "out_of_stock":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  export function getStockStatus(quantity: number) {
    if (quantity <= 0) {
      return { label: "Out of stock", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" }
    } else if (quantity <= 10) {
      return { label: "Low stock", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" }
    } else {
      return { label: "In stock", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" }
    }}