// LayoutWrapper.tsx
"use client";

import Header from "./Header";
import Footer from "./Footer";
import MobileNavBar from "./MobileNavBar";
import CommunitySection from "../home/community-section";
import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")  || pathname?.startsWith("/invoice") || pathname?.startsWith("/checkout/payment-success") || pathname?.startsWith("/forgot-password");
  // const isAdminRoute = pathname?.startsWith('/admin') ?? false

  return (
    <>
      {!isAuthPage && <Header />}
      <main className={!isAuthPage ? "pt-[var(--header-height)]" : ""}>
        {children}
      </main>
      {!isAuthPage && <CommunitySection />}
      {!isAuthPage && <Footer />}
      <ToastContainer position="top-right" autoClose={3000} />
      {!isAuthPage && <MobileNavBar />}
    </>
  );
}
