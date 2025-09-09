import { CartComponentContent } from "@/components/reuse/CartComponentContent";


// This is your actual page component
export default function CartPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchParams,
}: {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string }>;
}) {
  // If you need to use params or searchParams, you can await them here
  // const resolvedParams = await params;
  // const resolvedSearchParams = await searchParams;
  
  return <CartComponentContent />;
}