// src/app/(public)/checkout/page.tsx
import { Metadata } from "next";
import { CheckoutComponent } from "@/components/reuse/CheckoutComponent";

// Generate metadata for this page
export const metadata: Metadata = {
  title: "Checkout - Your Store",
  description: "Complete your purchase securely",
};

// This is your actual page component
export default async function CheckoutPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchParams,
}: {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // If you need to use params or searchParams, you can await them here
  // const resolvedParams = await params;
  // const resolvedSearchParams = await searchParams;
  
  return <CheckoutComponent />;
}