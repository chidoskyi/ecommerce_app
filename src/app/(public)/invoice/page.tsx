// src/app/(public)/invoice/page.tsx
import { InvoiceComponent } from "@/components/reuse/InvoiceComponent";
import { Metadata } from "next";
import { Suspense } from "react";

// Generate metadata for this page
export const metadata: Metadata = {
  title: "Invoice - Your Store",
  description: "View your order invoice",
};

// Loading component for Suspense boundary
function InvoiceLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading invoice...</p>
      </div>
    </div>
  );
}

// Wrapper component to handle search params
function InvoiceWrapper() {
  // The InvoiceComponent will handle extracting orderId from searchParams internally
  // This approach works with both /invoice?orderId=xxx and /invoice/[orderId] routes
  return <InvoiceComponent />;
}

// Main page component
export default function InvoicePage() {
  return (
    <Suspense fallback={<InvoiceLoading />}>
      <InvoiceWrapper />
    </Suspense>
  );
}