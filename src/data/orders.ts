export const ordersData = [
    {
      id: "ORD-2023-1001",
      customer: { name: "John Doe", email: "john@example.com", id: "CUST-1001" },
      date: "2025-07-15T10:30:00",
      status: "completed",
      total: 129.99,
      items: [
        { id: 1, name: "Premium T-Shirt", price: 29.99, quantity: 2, total: 59.98 },
        { id: 2, name: "Designer Jeans", price: 70.0, quantity: 1, total: 70.0 },
      ],
      shipping: {
        address: "123 Main St, Anytown, CA 12345",
        method: "Standard Shipping",
        cost: 5.99,
      },
      payment: {
        method: "Credit Card",
        cardLast4: "4242",
        status: "paid",
      },
    },
    {
      id: "ORD-2023-1002",
      customer: { name: "Jane Smith", email: "jane@example.com", id: "CUST-1002" },
      date: "2025-07-16T14:45:00",
      status: "processing",
      total: 85.5,
      items: [{ id: 3, name: "Running Shoes", price: 79.99, quantity: 1, total: 79.99 }],
      shipping: {
        address: "456 Oak Ave, Somewhere, NY 54321",
        method: "Express Shipping",
        cost: 12.99,
      },
      payment: {
        method: "PayPal",
        email: "jane@example.com",
        status: "paid",
      },
    },
    {
      id: "ORD-2023-1003",
      customer: { name: "Robert Johnson", email: "robert@example.com", id: "CUST-1003" },
      date: "2025-07-14T09:15:00",
      status: "shipped",
      total: 210.75,
      items: [
        { id: 4, name: "Wireless Headphones", price: 149.99, quantity: 1, total: 149.99 },
        { id: 5, name: "Phone Case", price: 19.99, quantity: 2, total: 39.98 },
      ],
      shipping: {
        address: "789 Pine St, Elsewhere, TX 67890",
        method: "Standard Shipping",
        cost: 5.99,
      },
      payment: {
        method: "Credit Card",
        cardLast4: "1234",
        status: "paid",
      },
    },
    {
      id: "ORD-2023-1004",
      customer: { name: "Emily Davis", email: "emily@example.com", id: "CUST-1004" },
      date: "2025-07-13T16:30:00",
      status: "cancelled",
      total: 45.99,
      items: [{ id: 6, name: "Yoga Mat", price: 39.99, quantity: 1, total: 39.99 }],
      shipping: {
        address: "101 Maple Dr, Nowhere, WA 13579",
        method: "Standard Shipping",
        cost: 5.99,
      },
      payment: {
        method: "Credit Card",
        cardLast4: "5678",
        status: "refunded",
      },
    },
    {
      id: "ORD-2023-1005",
      customer: { name: "Michael Wilson", email: "michael@example.com", id: "CUST-1005" },
      date: "2025-07-17T11:20:00",
      status: "pending",
      total: 320.5,
      items: [
        { id: 7, name: "Smart Watch", price: 299.99, quantity: 1, total: 299.99 },
        { id: 8, name: "Watch Band", price: 19.99, quantity: 1, total: 19.99 },
      ],
      shipping: {
        address: "202 Cedar Ln, Anyplace, FL 24680",
        method: "Express Shipping",
        cost: 12.99,
      },
      payment: {
        method: "Bank Transfer",
        status: "pending",
      },
    },
  ]