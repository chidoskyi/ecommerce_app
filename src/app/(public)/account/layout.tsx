"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Package,
  CreditCard,
  MapPin,
  Heart,
  Bell,
  ShieldCheck,
  LogOut,
  Wallet,
  ChevronDown,
  ChevronRight,
  Upload,
} from "lucide-react";
import Container from "@/components/reuse/Container";
import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Client-side utility functions to avoid server-only imports
const getUserDisplayName = (user: any) => {
  if (!user) return "";
  return user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User";
};

const getUserEmail = (user: any) => {
  if (!user) return "";
  return user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const segments = (pathname ?? "").split("/").filter(Boolean);
  const currentPage = segments[segments.length - 1];

  const formattedName =
    currentPage.charAt(0).toUpperCase() +
    currentPage.slice(1).replace(/-/g, " ");

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <Container className="mx-auto py-10 px-4 bg-white shadow-sm mb-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Container>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  const displayName = getUserDisplayName(clerkUser);
  const email = getUserEmail(clerkUser);

  const navigationItems = [
    { href: "/account/profile", label: "Profile", icon: User },
    { href: "/account/orders", label: "Orders", icon: Package },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart },
    { href: "/account/addresses", label: "Addresses", icon: MapPin },
    { href: "/account/wallet", label: "Wallet", icon: Wallet },
    { href: "/account/security", label: "Security", icon: ShieldCheck },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full bg-white mx-auto px-0 md:px-4 sm:px-6 lg:px-8 py-5 mb-3 md:mb-8">
        <Container className="text-lg text-gray-500 font-semibold">
          <Link href="/">
            <span className="hover:text-orange-600 cursor-pointer">Home</span>
          </Link>
          <span className="mx-2">›</span>
        </Container>
      </div>
      <Container className="mx-auto py-10 px-4 bg-white shadow-sm mb-10">

        {/* Mobile Navigation Toggle - Only visible on small screens */}
        <div className="lg:hidden mb-6 flex justify-between item-center relative">
          <h2 className="p-2 font-semibold">My Profile</h2>
          <Button
            variant="outline"
            className="justify-between border-gray-200 relative"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <span>Account Navigation</span>
            <ChevronRight
              className={`h-5 w-5 transition-transform duration-200 ${
                mobileNavOpen ? "rotate-90" : ""
              }`}
            />
            {/* Mobile Navigation Dropdown */}
            {mobileNavOpen && (
              <div className="absolute z-50 mt-2 right-0 w-full top-3/4 space-y-1 border-gray-300 border rounded-lg p-2 bg-white shadow-lg">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center p-2 rounded-md ${
                        isActive
                          ? "bg-orange-50 text-orange-600"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon className="mr-2 h-5 w-5" />
                      {item.label}
                      {isActive && <ChevronRight className="ml-auto h-5 w-5" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Profile Sidebar - Hidden on mobile */}
          <div className="hidden lg:block space-y-6">

            {/* Profile Card */}
            <Card className="border-gray-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  {isSignedIn ? (
                    <>
                      <Avatar className="h-24 w-24">
                        <AvatarImage 
                          src={clerkUser.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} 
                          alt={displayName} 
                        />
                        <AvatarFallback>
                          {displayName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <h2 className="text-xl font-semibold">{displayName}</h2>
                        <p className="text-sm text-muted-foreground">
                          {email}
                        </p>
                        {/* <div className="mt-2 flex justify-center">
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                          >
                            {membershipLevel} Member
                          </Badge>
                        </div> */}
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="border-1 border-dashed rounded-full p-5 w-20 h-20 flex items-center justify-center mx-auto">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Upload a new profile picture
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Max file size: 2MB. Supported formats: JPG, PNG, WebP
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 bg-orange-600 text-white cursor-pointer"
                        >
                          Select Image
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-between hover:bg-gray-200 hover:text-orange-600 ${
                      isActive ? "text-orange-600" : ""
                    }`}
                    asChild
                  >
                    <Link
                      href={item.href}
                      className="flex items-center justify-between w-full"
                    >
                      <span className="flex items-center">
                        <Icon className="mr-2 h-6 w-6" />
                        {item.label}
                      </span>
                      <ChevronRight
                        className={`ml-2 h-6 w-6 transition-transform duration-200 ${
                          isActive ? "rotate-90" : ""
                        }`}
                      />
                    </Link>
                  </Button>
                );
              })}

              <Separator className="my-4" />

              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div>{children}</div>
        </div>
      </Container>
    </>
  );
}


// "use client";

// import { usePathname } from "next/navigation";
// import Link from "next/link";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import {
//   User,
//   Package,
//   CreditCard,
//   MapPin,
//   Heart,
//   Bell,
//   ShieldCheck,
//   LogOut,
//   Wallet,
//   ChevronDown,
//   ChevronRight,
//   Upload,
// } from "lucide-react";
// import Container from "@/components/reuse/Container";
// import { useState } from "react";
// import { useUser, useClerk } from "@clerk/nextjs";
// import { getUserDisplayName, getUserEmail } from "@/lib/clerk-utils";
// import { useRouter } from "next/navigation";

// export default function AccountLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const pathname = usePathname();
//   const { isSignedIn, user: clerkUser, isLoaded } = useUser();
//   const { signOut } = useClerk();
//   const router = useRouter();
//   const [mobileNavOpen, setMobileNavOpen] = useState(false);

//   const segments = (pathname ?? "").split("/").filter(Boolean);
//   const currentPage = segments[segments.length - 1];

//   const formattedName =
//     currentPage.charAt(0).toUpperCase() +
//     currentPage.slice(1).replace(/-/g, " ");

//   const handleSignOut = async () => {
//     try {
//       await signOut();
//       router.push('/');
//     } catch (error) {
//       console.error('Error signing out:', error);
//     }
//   };

//   // Show loading state while Clerk is loading
//   if (!isLoaded) {
//     return (
//       <Container className="mx-auto py-10 px-4 bg-white shadow-sm mb-10">
//         <div className="animate-pulse space-y-4">
//           <div className="h-8 bg-gray-200 rounded w-1/4"></div>
//           <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
//             <div className="space-y-4">
//               <div className="h-32 bg-gray-200 rounded"></div>
//               <div className="space-y-2">
//                 {[...Array(6)].map((_, i) => (
//                   <div key={i} className="h-10 bg-gray-200 rounded"></div>
//                 ))}
//               </div>
//             </div>
//             <div className="h-96 bg-gray-200 rounded"></div>
//           </div>
//         </div>
//       </Container>
//     );
//   }

//   // Redirect to sign-in if not authenticated
//   if (!isSignedIn) {
//     router.push('/sign-in');
//     return null;
//   }

//   const displayName = getUserDisplayName(clerkUser);
//   const email = getUserEmail(clerkUser);

//   const navigationItems = [
//     { href: "/account/profile", label: "Profile", icon: User },
//     { href: "/account/orders", label: "Orders", icon: Package },
//     { href: "/account/wishlist", label: "Wishlist", icon: Heart },
//     { href: "/account/addresses", label: "Addresses", icon: MapPin },
//     { href: "/account/wallet", label: "Wallet", icon: Wallet },
//     { href: "/account/security", label: "Security", icon: ShieldCheck },
//   ];

//   return (
//     <>
//       {/* Breadcrumb */}
//       <div className="w-full bg-white mx-auto px-0 md:px-4 sm:px-6 lg:px-8 py-5 mb-3 md:mb-8">
//         <Container className="text-lg text-gray-500 font-semibold">
//           <Link href="/">
//             <span className="hover:text-orange-600 cursor-pointer">Home</span>
//           </Link>
//           <span className="mx-2">›</span>
//         </Container>
//       </div>
//       <Container className="mx-auto py-10 px-4 bg-white shadow-sm mb-10">

//         {/* Mobile Navigation Toggle - Only visible on small screens */}
//         <div className="lg:hidden mb-6 flex justify-between item-center relative">
//           <h2 className="p-2 font-semibold">My Profile</h2>
//           <Button
//             variant="outline"
//             className="justify-between border-gray-200 relative"
//             onClick={() => setMobileNavOpen(!mobileNavOpen)}
//           >
//             <span>Account Navigation</span>
//             <ChevronRight
//               className={`h-5 w-5 transition-transform duration-200 ${
//                 mobileNavOpen ? "rotate-90" : ""
//               }`}
//             />
//             {/* Mobile Navigation Dropdown */}
//             {mobileNavOpen && (
//               <div className="absolute z-50 mt-2 right-0 w-full top-3/4 space-y-1 border-gray-300 border rounded-lg p-2 bg-white shadow-lg">
//                 {navigationItems.map((item) => {
//                   const Icon = item.icon;
//                   const isActive = pathname === item.href;

//                   return (
//                     <Link
//                       key={item.href}
//                       href={item.href}
//                       className={`flex items-center p-2 rounded-md ${
//                         isActive
//                           ? "bg-orange-50 text-orange-600"
//                           : "hover:bg-gray-100"
//                       }`}
//                       onClick={() => setMobileNavOpen(false)}
//                     >
//                       <Icon className="mr-2 h-5 w-5" />
//                       {item.label}
//                       {isActive && <ChevronRight className="ml-auto h-5 w-5" />}
//                     </Link>
//                   );
//                 })}
//               </div>
//             )}
//           </Button>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
//           {/* Profile Sidebar - Hidden on mobile */}
//           <div className="hidden lg:block space-y-6">

//             {/* Profile Card */}
//             <Card className="border-gray-200">
//               <CardContent className="p-6">
//                 <div className="flex flex-col items-center space-y-4">
//                   {isSignedIn ? (
//                     <>
//                       <Avatar className="h-24 w-24">
//                         <AvatarImage 
//                           src={clerkUser.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} 
//                           alt={displayName} 
//                         />
//                         <AvatarFallback>
//                           {displayName
//                             .split(" ")
//                             .map((n) => n[0])
//                             .join("")
//                             .toUpperCase()}
//                         </AvatarFallback>
//                       </Avatar>
//                       <div className="text-center">
//                         <h2 className="text-xl font-semibold">{displayName}</h2>
//                         <p className="text-sm text-muted-foreground">
//                           {email}
//                         </p>
//                         {/* <div className="mt-2 flex justify-center">
//                           <Badge
//                             variant="secondary"
//                             className="bg-amber-100 text-amber-800 hover:bg-amber-200"
//                           >
//                             {membershipLevel} Member
//                           </Badge>
//                         </div> */}
//                       </div>
//                     </>
//                   ) : (
//                     <div className="text-center space-y-4">
//                       <div className="border-1 border-dashed rounded-full p-5 w-20 h-20 flex items-center justify-center mx-auto">
//                         <Upload className="h-8 w-8 text-gray-400" />
//                       </div>
//                       <div>
//                         <p className="text-sm text-muted-foreground">
//                           Upload a new profile picture
//                         </p>
//                         <p className="text-xs text-gray-500 mt-1">
//                           Max file size: 2MB. Supported formats: JPG, PNG, WebP
//                         </p>
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           className="mt-2 bg-orange-600 text-white cursor-pointer"
//                         >
//                           Select Image
//                         </Button>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>

//             <div className="space-y-1">
//               {navigationItems.map((item) => {
//                 const Icon = item.icon;
//                 const isActive = pathname === item.href;

//                 return (
//                   <Button
//                     key={item.href}
//                     variant={isActive ? "default" : "ghost"}
//                     className={`w-full justify-between hover:bg-gray-200 hover:text-orange-600 ${
//                       isActive ? "text-orange-600" : ""
//                     }`}
//                     asChild
//                   >
//                     <Link
//                       href={item.href}
//                       className="flex items-center justify-between w-full"
//                     >
//                       <span className="flex items-center">
//                         <Icon className="mr-2 h-6 w-6" />
//                         {item.label}
//                       </span>
//                       <ChevronRight
//                         className={`ml-2 h-6 w-6 transition-transform duration-200 ${
//                           isActive ? "rotate-90" : ""
//                         }`}
//                       />
//                     </Link>
//                   </Button>
//                 );
//               })}

//               <Separator className="my-4" />

//               <Button
//                 variant="ghost"
//                 className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
//                 onClick={handleSignOut}
//               >
//                 <LogOut className="mr-2 h-4 w-4" />
//                 Sign Out
//               </Button>
//             </div>
//           </div>

//           {/* Main Content */}
//           <div>{children}</div>
//         </div>
//       </Container>
//     </>
//   );
// }