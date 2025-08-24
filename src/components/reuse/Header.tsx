"use client";

import React, { useState, useEffect, useRef } from "react";
import { HeaderProps } from "@/lib/types";
import { DesktopHeader, MobileHeader, MobileSidebar } from "./NavBar";
import TopBanner from "./TopBanner";
import Container from "./Container";
import CartSidebar from "./CartSideBar";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/types/users";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { selectWishlistCount } from "@/app/store/slices/wishlistSlice";
import { StorageUtil } from "@/lib/storageKeys";

// Import your cart actions and selectors
import {
  updateCartQuantity,
  loadCartAction,
  closeCart,
  openCart,
  setAuthenticated,
  fetchCart,
  mergeGuestCart,
  selectUserIdentification,
} from "@/app/store/slices/cartSlice";

// Main Header Component
const Header: React.FC<HeaderProps> = () => {
  // Clerk hooks for authentication
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const dispatch = useDispatch();

  // Redux selectors for cart and wishlist
  const wishlistCount = useSelector(selectWishlistCount);
  const cart = useSelector((state: any) => state.cart);
  const userIdentification = useSelector(selectUserIdentification);

  // Extract cart data from Redux store
  const cartItems = cart.items || [];
  const totalCartItems = cart.itemCount || 0;
  const cartSubtotal = cart.subtotal || 0;
  const isCartLoading = cart.loading || false;
  const isCartOpen = cart.isOpen || false;

  // UI State
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(true);

  const headerRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Track previous authentication state to detect changes
  const [prevAuthState, setPrevAuthState] = useState<{
    isSignedIn: boolean | undefined;
    userId: string | null;
  }>({
    isSignedIn: undefined,
    userId: null,
  });

  const [headerHeight, setHeaderHeight] = useState({
    withBanner: 220,
    withoutBanner: 136,
    desktopWithBanner: 172,
    desktopWithoutBanner: 120,
  });

  const placeholderList: string[] = [
    "Search for products...",
    "Find your favorite items...",
    "What are you looking for?",
    "Search our store...",
    "Discover new products...",
  ];

  const [placeholder, setPlaceholder] = useState<string>(placeholderList[0]);

  // Initialize storage migration and load cart on mount
  useEffect(() => {
    StorageUtil.migrateOldKeys();
    dispatch(loadCartAction());
    StorageUtil.debugStorage();
  }, [dispatch]);

  // Enhanced authentication handling with StorageUtil
  useEffect(() => {
    if (!isLoaded) return;

    const userId = clerkUser?.id || null;
    const isAuthenticated = !!isSignedIn;

    // Check if this is an authentication state change
    const authStateChanged =
      prevAuthState.isSignedIn !== isSignedIn ||
      prevAuthState.userId !== userId;

    console.log("🔐 Authentication state:", {
      isAuthenticated,
      userId,
      authStateChanged,
      prevAuthState,
      currentItems: cartItems.length,
      currentUserIdentification: userIdentification,
    });

    // Update Redux authentication state
    dispatch(
      setAuthenticated({
        isAuthenticated,
        userId,
      })
    );

    if (isAuthenticated && userId && authStateChanged) {
      // User just logged in
      console.log("🔄 User logged in - handling cart merge");
      
      // FIXED: Get guest ID BEFORE any storage changes
      const currentGuestId = StorageUtil.getGuestIdForMerge();
      
      // FIXED: Set user mode but preserve guest ID for merging
      StorageUtil.setUserMode(userId);

      if (currentGuestId) {
        console.log("🛒 Merging guest cart:", { guestId: currentGuestId });
        
        dispatch(mergeGuestCart({ userId }))
          .then((result) => {
            console.log("✅ Cart merge completed:", result);
            // FIXED: Now safe to fully switch to user mode (clears guest ID)
            StorageUtil.switchToUserMode(userId);
            return dispatch(fetchCart({ userId, guestId: null }));
          })
          .then(() => {
            console.log("✅ Cart refreshed after merge");
          })
          .catch((error) => {
            console.error("❌ Cart merge failed:", error);
            // FIXED: On failure, still switch to user mode but preserve some guest data
            console.log("⚠️ Switching to user mode despite merge failure");
            StorageUtil.switchToUserMode(userId);
            // Fallback: fetch user's cart directly
            dispatch(fetchCart({ userId, guestId: null }));
          });
      } else {
        console.log("📥 No guest cart found, fetching user cart");
        // FIXED: Safe to fully switch since no merge needed
        StorageUtil.switchToUserMode(userId);
        dispatch(fetchCart({ userId, guestId: null }));
      }
    } else if (!isAuthenticated && prevAuthState.isSignedIn) {
      // User just signed out
      console.log("👋 User signed out, switching to guest mode");
      
      const newGuestId = StorageUtil.switchToGuestMode();
      dispatch(fetchCart({ userId: null, guestId: newGuestId }));
    } else if (!isAuthenticated && !userIdentification.guestId) {
      // First time visitor or missing guest ID
      console.log("🆕 Setting up guest session");
      
      const guestId = StorageUtil.getGuestId(); // This will generate if needed
      dispatch(fetchCart({ userId: null, guestId }));
    }

    // Update previous auth state
    setPrevAuthState({
      isSignedIn,
      userId,
    });
  }, [isLoaded, isSignedIn, clerkUser?.id, dispatch]);

  // Sync Redux state with localStorage (separate effect to prevent loops)
  useEffect(() => {
    if (!isLoaded) return;

    const storedUserId = StorageUtil.getUserId();
    const storedGuestId = StorageUtil.getGuestId();

    console.log("🔍 Syncing storage with Redux:", {
      storedUserId,
      storedGuestId,
      reduxUserId: userIdentification.userId,
      reduxGuestId: userIdentification.guestId,
      isSignedIn,
    });

    // Only sync if there's a clear mismatch
    if (isSignedIn && clerkUser?.id) {
      if (storedUserId !== clerkUser.id) {
        console.log("🔧 Fixing userId storage mismatch");
        StorageUtil.switchToUserMode(clerkUser.id);
      }
    } else if (!isSignedIn) {
      if (storedUserId || !storedGuestId) {
        console.log("🔧 Fixing guest storage setup");
        StorageUtil.switchToGuestMode();
      }
    }
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  // Handle cart refresh events
  useEffect(() => {
    const handleCartRefresh = () => {
      if (isSignedIn && clerkUser?.id) {
        console.log("🔄 Manual cart refresh triggered");
        StorageUtil.switchToUserMode(clerkUser.id);
        dispatch(fetchCart({ userId: clerkUser.id, guestId: null }));
      }
    };

    window.addEventListener("refreshCart", handleCartRefresh);
    return () => window.removeEventListener("refreshCart", handleCartRefresh);
  }, [isSignedIn, clerkUser?.id, dispatch]);

  // Transform Clerk user data
  const user: User | null = clerkUser
    ? {
        name: clerkUser.fullName || clerkUser.firstName || "User",
        initial:
          clerkUser.firstName?.charAt(0).toUpperCase() ||
          clerkUser.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase() ||
          "U",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
      }
    : null;

  // Placeholder rotation effect
  useEffect(() => {
    const updatePlaceholder = (): void => {
      const random =
        placeholderList[Math.floor(Math.random() * placeholderList.length)];
      setPlaceholder(random);
    };

    updatePlaceholder();
    const interval = setInterval(updatePlaceholder, 5000);
    return () => clearInterval(interval);
  }, []);

  // Banner close handler
  const handleBannerClose = (): void => {
    setIsBannerVisible(false);
  };

  // Calculate and update header height dynamically
  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        const headerElement = headerRef.current;
        const totalHeight = headerElement.offsetHeight;

        document.documentElement.style.setProperty(
          "--header-height",
          `${totalHeight}px`
        );

        const isDesktop = window.innerWidth >= 768;
        const bannerHeight = bannerRef.current?.offsetHeight || 0;
        const headerOnlyHeight =
          isBannerVisible && isAtTop ? totalHeight - bannerHeight : totalHeight;

        if (isDesktop) {
          setHeaderHeight((prev) => ({
            ...prev,
            desktopWithBanner: isBannerVisible ? totalHeight : headerOnlyHeight,
            desktopWithoutBanner: headerOnlyHeight,
          }));
        } else {
          setHeaderHeight((prev) => ({
            ...prev,
            withBanner: isBannerVisible ? totalHeight : headerOnlyHeight,
            withoutBanner: headerOnlyHeight,
          }));
        }
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [isAtTop, isBannerVisible]);

  // Scroll handling for header visibility
  useEffect(() => {
    const handleScroll = (): void => {
      const currentScrollY = window.scrollY;
      const isTop = currentScrollY <= 5;
      const scrolledPastThreshold = currentScrollY > 150;

      setIsAtTop(isTop);

      if (isTop || !scrolledPastThreshold) {
        setShowHeader(true);
        return;
      }

      setShowHeader(currentScrollY < lastScrollY);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Event Handlers
  const handleSignIn = (): void => {
    router.push("/sign-in");
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut();
      
      // Switch to guest mode using StorageUtil
      const newGuestId = StorageUtil.switchToGuestMode();

      // Update authentication state
      dispatch(
        setAuthenticated({
          isAuthenticated: false,
          userId: null,
        })
      );

      // Refresh cart for guest mode
      dispatch(fetchCart({ userId: null, guestId: newGuestId }));
      router.push("/");
    } catch (error) {
      console.error("❌ Error signing out:", error);
    }
  };

  const handleCartOpen = (): void => {
    dispatch(openCart());
  };

  const handleCartClose = (): void => {
    dispatch(closeCart());
  };

  const ensureUserIdentification = (): { userId: string | null; guestId: string | null } => {
    // Get the most current values from storage and Redux
    const storageUserId = StorageUtil.getUserId();
    const storageGuestId = StorageUtil.getGuestIdForMerge() || StorageUtil.getGuestId();
    const reduxUserId = userIdentification.userId;
    const reduxGuestId = userIdentification.guestId;
    
    console.log("🔍 User identification check:", {
      storageUserId,
      storageGuestId,
      reduxUserId,
      reduxGuestId,
      clerkUserId: clerkUser?.id,
      isSignedIn
    });

    // Priority order: Clerk user > Storage > Redux
    let finalUserId: string | null = null;
    let finalGuestId: string | null = null;

    if (isSignedIn && clerkUser?.id) {
      // User is authenticated
      finalUserId = clerkUser.id;
      finalGuestId = null;
      
      // Ensure storage is in sync
      if (storageUserId !== clerkUser.id) {
        console.log("🔧 Syncing storage with authenticated user");
        StorageUtil.setUserMode(clerkUser.id);
      }
      
      // Ensure Redux is in sync
      if (reduxUserId !== clerkUser.id) {
        console.log("🔧 Syncing Redux with authenticated user");
        dispatch(setAuthenticated({
          isAuthenticated: true,
          userId: clerkUser.id,
        }));
      }
    } else {
      // User is not authenticated - use guest mode
      finalUserId = null;
      finalGuestId = storageGuestId || reduxGuestId;
      
      // If no guest ID exists anywhere, create one
      if (!finalGuestId) {
        console.log("⚠️ Creating new guest ID for cart operation");
        finalGuestId = StorageUtil.generateAndSetGuestId();
        dispatch(setAuthenticated({
          isAuthenticated: false,
          userId: null,
        }));
      }
    }

    console.log("✅ Final user identification:", { 
      userId: finalUserId, 
      guestId: finalGuestId 
    });

    return { userId: finalUserId, guestId: finalGuestId };
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number): void => {
    console.log("🛒 handleUpdateQuantity called:", {
      itemId,
      newQuantity,
      currentUserIdentification: userIdentification,
      isSignedIn,
      clerkUserId: clerkUser?.id
    });

    if (!itemId || newQuantity < 0) {
      console.error("❌ Invalid parameters for updateQuantity");
      return;
    }

    // Ensure we have proper user identification
    const { userId, guestId } = ensureUserIdentification();

    if (!userId && !guestId) {
      console.error("❌ Could not establish user identification for cart update");
      toast.error("Unable to update cart. Please refresh the page.");
      return;
    }

    console.log("🔄 Updating cart with identification:", { userId, guestId });

    dispatch(
      updateCartQuantity({
        cartItemId: itemId,
        quantity: newQuantity,
        userId,
        guestId,
      })
    );
  };

  const handleRemoveItem = (itemId: string): void => {
    console.log("🗑️ handleRemoveItem called:", { itemId });

    if (!itemId) {
      console.error("❌ Invalid itemId for removeItem");
      return;
    }

    // Ensure we have proper user identification
    const { userId, guestId } = ensureUserIdentification();

    if (!userId && !guestId) {
      console.error("❌ Could not establish user identification for cart removal");
      toast.error("Unable to remove item. Please refresh the page.");
      return;
    }

    console.log("🔄 Removing item with identification:", { userId, guestId });

    // Remove item by setting quantity to 0
    dispatch(
      updateCartQuantity({
        cartItemId: itemId,
        quantity: 0,
        userId,
        guestId,
      })
    );
  };

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 shadow-md">
        <div className="px-4 py-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={headerRef}
        className={`
          fixed top-0 left-0 right-0
          z-50
          transition-all duration-300 ease-out
          ${
            showHeader
              ? "translate-y-0 shadow-md"
              : "-translate-y-full shadow-none"
          }
        `}
      >
        <AnimatePresence>
          {isAtTop && isBannerVisible && TopBanner && (
            <motion.div
              ref={bannerRef}
              key="top-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              onAnimationComplete={() => {
                setTimeout(() => {
                  if (headerRef.current) {
                    const height = headerRef.current.offsetHeight;
                    document.documentElement.style.setProperty(
                      "--header-height",
                      `${height}px`
                    );
                  }
                }, 10);
              }}
            >
              <TopBanner onClose={handleBannerClose} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.header
          className="bg-orange-600 shadow-md"
          initial={false}
          animate={{
            y: showHeader ? 0 : -10,
            opacity: showHeader ? 1 : 0.9,
          }}
        >
          {Container ? (
            <Container>
              <section className="py-4 md:py-6">
                <div className="mx-auto">
                  <DesktopHeader
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    placeholder={placeholder}
                    totalCartItems={totalCartItems}
                    handleCartOpen={handleCartOpen}
                    isSignedIn={isSignedIn}
                    showDropdown={showDropdown}
                    setShowDropdown={setShowDropdown}
                    handleSignIn={handleSignIn}
                    handleLogout={handleLogout}
                    wishlistCount={wishlistCount}
                    user={user}
                  />

                  <MobileHeader
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    placeholder={placeholder}
                    totalCartItems={totalCartItems}
                    handleCartOpen={handleCartOpen}
                    onMenuClick={() => setIsSidebarOpen(true)}
                  />
                </div>
              </section>
            </Container>
          ) : (
            <section className="px-4 py-4">
              <div className="mx-auto max-w-7xl">
                <DesktopHeader
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  placeholder={placeholder}
                  totalCartItems={totalCartItems}
                  handleCartOpen={handleCartOpen}
                  isSignedIn={isSignedIn}
                  showDropdown={showDropdown}
                  setShowDropdown={setShowDropdown}
                  handleSignIn={handleSignIn}
                  handleLogout={handleLogout}
                  wishlistCount={wishlistCount}
                  user={user}
                />

                <MobileHeader
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  placeholder={placeholder}
                  totalCartItems={totalCartItems}
                  handleCartOpen={handleCartOpen}
                  onMenuClick={() => setIsSidebarOpen(true)}
                />
              </div>
            </section>
          )}
        </motion.header>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isSignedIn={isSignedIn}
        handleSignIn={handleSignIn}
        handleLogout={handleLogout}
        user={user}
      />

      {/* Cart Sidebar */}
      {CartSidebar && (
        <CartSidebar
          isOpen={isCartOpen}
          onClose={handleCartClose}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          isLoading={isCartLoading}
          subtotal={cartSubtotal}
        />
      )}
    </>
  );
};

export default Header;