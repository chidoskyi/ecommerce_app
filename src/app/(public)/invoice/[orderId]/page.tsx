// src/app/(public)/invoice/[orderId]/page.tsx
import { InvoiceComponent } from "@/components/reuse/IncoiceComponent";
import { Metadata } from "next";

// Generate metadata for this page
export const metadata: Metadata = {
  title: "Invoice - Your Store",
  description: "View your order invoice",
};

// This is your actual page component
export default async function InvoicePage({
  params,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Extract orderId from params
  const { orderId } = await params;
  
  return <InvoiceComponent orderId={orderId} />;
}