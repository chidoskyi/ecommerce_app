"use client";

import {
  Search,
  ShoppingCart,
  X,
  Menu,
  LogOut,
  Heart,
  Wallet,
  Package,
  User,
  ChevronDown,
  UserCog,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  SearchBarProps,
  MobileSidebarProps,
  DesktopHeaderProps,
  MobileHeaderProps,
  WishButtonProps,
} from "@/types";
import { CartButtonProps } from "@/types/carts";
import { UserDropdownProps } from "@/types/users";
import SearchDropdown from "./SearchDropDown";
import { useProducts } from "@/app/store/slices/productSlice";
import { selectIsAdmin, selectUser, selectIsLoading, selectError, fetchUser, clearUser } from '@/app/store/slices/userSlice';
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";

interface UserLink {
  icon: React.ReactNode;
  text: string;
  link: string;
  isAdmin?: boolean;
}

const userLinks = [
  {
    icon: <User className="w-5 h-5" />,
    text: "Account Settings",
    link: "/account/profile",
  },
  {
    icon: <Package className="w-5 h-5" />,
    text: "My Orders",
    link: "/account/orders",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    text: "Wallet",
    link: "/account/wallet",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    text: "Favorites",
    link: "/account/wishlist",
  },
];

// Logo Component
export const Logo: React.FC = () => (
  <div className="flex items-center gap-2">
    <Link href="/" className="flex items-center gap-2">
      <div className="w-40 h-8 rounded flex items-center justify-center">
        <Image
        src="/shop-grocery.png"
        alt="shop grocery"
        width={300}
        height={50}
        />
      </div>
    </Link>
  </div>
);

// Updated SearchBar Component
export const SearchBar: React.FC<SearchBarProps> = ({
  inputValue,
  setInputValue,
  placeholder,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show dropdown when there's input and the search bar is focused
  useEffect(() => {
    setIsDropdownVisible(inputValue.length > 0 && isFocused);
  }, [inputValue, isFocused]);

  // Get products actions for search integration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { actions: productActions } = useProducts();

  // Handle Enter key press - navigate to products page with search parameter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Navigate to products page with search parameter
      window.location.href = `/products?search=${encodeURIComponent(inputValue.trim())}`;
      
      // Close the dropdown
      handleCloseDropdown();
    }
  };

  const handleCloseDropdown = () => {
    setIsDropdownVisible(false);
    setIsFocused(false);
  };

  return (
    <div className="relative h-12 w-full" ref={searchContainerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
      {isClient && (
        <>
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-3 bg-gray-50 border md:max-w-[55rem] border-gray-200 rounded-full w-full h-12 text-gray-700 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            // placeholder={placeholder}
          />

          {!inputValue && (
            <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 leading-none z-5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholder}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="block text-sm md:text-lg font-medium"
                >
                  {placeholder}
                </motion.span>
              </AnimatePresence>
            </div>
          )}

          {/* Search Dropdown */}
          <SearchDropdown
            isVisible={isDropdownVisible}
            searchQuery={inputValue}
            onClose={handleCloseDropdown}
            searchContainerRef={searchContainerRef}
          />
        </>
      )}
    </div>
  );
};

// Cart Button Component
export const CartButton: React.FC<CartButtonProps> = ({
  totalCartItems,
  onClick,
}) => (
  <motion.button
    className="relative p-2 cursor-pointer"
    onClick={onClick}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    <ShoppingCart className="w-6 h-6 text-gray-100" />
    <motion.span
      className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
      key={totalCartItems}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring" }}
    >
      {totalCartItems}
    </motion.span>
  </motion.button>
);

export const WishButton: React.FC<WishButtonProps> = ({
  href,
  wishlistCount,
}) => (
  <>
    <Link href={href} className=" p-2 cursor-pointer">
      <motion.button
        className="relative p-2 cursor-pointer"
        // onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Heart className="w-6 h-6 text-gray-100" />

        <motion.span
          className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
          key={wishlistCount}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
        >
          {wishlistCount}
        </motion.span>
      </motion.button>
    </Link>
  </>
);

export const UserDropdown: React.FC<UserDropdownProps> = ({
  isSignedIn,
  showDropdown,
  setShowDropdown,
  handleSignIn,
  handleLogout: originalHandleLogout,
  user: propUser,
}) => {
  const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSignInState, setLastSignInState] = useState<boolean>(false);
  
  // Redux selectors for admin status and user data
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const reduxUser = useAppSelector(selectUser);
  const isUserLoading = useAppSelector(selectIsLoading);
  const userError = useAppSelector(selectError);
  
  // Use Redux user data if available, fallback to props
  const user = reduxUser || propUser;

  // Enhanced logout handler that clears Redux state
  const handleLogout = () => {
    // Clear Redux user state first
    dispatch(clearUser());
    // Then call the original logout handler
    originalHandleLogout();
    // Reset local state
    setLastSignInState(false);
  };

  // Enhanced sign-in handler that clears previous user data
  const handleSignInWithCleanup = () => {
    // Clear any existing user data to prevent state conflicts
    dispatch(clearUser());
    // Call the original sign-in handler
    handleSignIn();
  };

  // Detect sign-in state changes and handle user switching
  useEffect(() => {
    // If user just signed in (state changed from false to true)
    if (isSignedIn && !lastSignInState) {
      dispatch(clearUser()); // Clear any stale user data
      setLastSignInState(true);
    }
    // If user signed out (state changed from true to false)
    else if (!isSignedIn && lastSignInState) {
      dispatch(clearUser());
      setLastSignInState(false);
    }
  }, [isSignedIn, lastSignInState, dispatch]);

  // Fetch user data when signed in
  useEffect(() => {
    if (isSignedIn && !reduxUser && !isUserLoading && !userError) {
      dispatch(fetchUser());
    }
  }, [isSignedIn, reduxUser, isUserLoading, userError, dispatch]);

  // Alternative: Force refetch on every sign-in state change (more aggressive approach)
  // Uncomment this and comment out the above useEffect if you want to always refetch
  /*
  useEffect(() => {
    if (isSignedIn && !isUserLoading) {
      console.log('🔐 UserDropdown: Force fetching user data...');
      dispatch(fetchUser() as any);
    }
  }, [isSignedIn, dispatch]);
  */

  const handleMouseEnter = () => {
    if (mouseLeaveTimeout) {
      clearTimeout(mouseLeaveTimeout);
      setMouseLeaveTimeout(null);
    }
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowDropdown(false);
    }, 100);
    setMouseLeaveTimeout(timeout);
  };

  // Define user links with conditional admin link
  const getUserLinks = (): UserLink[] => {
    const baseLinks: UserLink[] = [
      {
        icon: <User className="w-5 h-5" />,
        text: "Account Settings",
        link: "/account/profile",
      },
      {
        icon: <Package className="w-5 h-5" />,
        text: "My Orders",
        link: "/account/orders",
      },
      {
        icon: <Wallet className="w-5 h-5" />,
        text: "Wallet",
        link: "/account/wallet",
      },
      {
        icon: <Heart className="w-5 h-5" />,
        text: "Favorites",
        link: "/account/wishlist",
      },
    ];

    // Add admin link if user is admin
    if (isAdmin) {
      return [
        {
          icon: <UserCog className="w-5 h-5 text-orange-600" />,
          text: "Admin Dashboard",
          link: "/admin",
          isAdmin: true, // Flag for special styling
        },
        ...baseLinks,
      ];
    }

    return baseLinks;
  };

  // Show loading state while fetching user data
  if (isSignedIn && isUserLoading) {
    return (
      <motion.div
        className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
    );
  }

  // Show sign-in button for non-authenticated users
  if (!isSignedIn) {
    return (
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          className="rounded-full text-gray-100 bg-transparent cursor-pointer"
          onClick={handleSignInWithCleanup}
        >
          Sign In
        </Button>
      </motion.div>
    );
  }

  const displayName = user?.firstName || "User";
  const displayInitial = user?.initial || user?.name?.charAt(0)?.toUpperCase() || "U";
  const userLinks = getUserLinks();

  return (
    <motion.div
      className="relative z-[1001]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02 }}
    >
      <motion.button
        className="md:flex cursor-pointer items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition-colors"
        whileHover={{ backgroundColor: "#16a34a" }}
      >
        <motion.div
          className={`w-8 h-8 ${isAdmin ? 'bg-purple-600' : 'bg-purple-600'} rounded-full flex items-center justify-center relative`}
          whileHover={{ rotate: 10 }}
          whileTap={{ rotate: -10 }}
        >
          <span className="text-white font-bold text-sm">{displayInitial}</span>
          {isAdmin && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Shield className="w-2 h-2 text-orange-600 m-0.5" />
            </motion.div>
          )}
        </motion.div>

        {/* User Icon (visible below md) */}
        <User className="block lg:hidden w-5 h-5 text-white" />

        {/* Display name with admin indicator (hidden below md) */}
        <div className="hidden lg:flex flex-col items-start">
          <span className="text-sm">Hello, {displayName}</span>
          {isAdmin && (
            <span className="text-xs text-green-200">Administrator</span>
          )}
        </div>

        <motion.div
          animate={{ rotate: showDropdown ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-80"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Arrow pointer */}
            <motion.div
              className="absolute right-1/2 -top-3 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-200 z-[1002]"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ delay: 0.1 }}
            />

            <motion.div
              className="absolute right-0 top-full -mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-4 z-[1001]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* User Info Header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-col items-center">
                  <motion.div
                    className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-3 relative"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span className="text-white font-bold text-xl">
                      {displayInitial}
                    </span>
                    {isAdmin && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Shield className="w-3 h-3 text-orange-600" />
                      </motion.div>
                    )}
                  </motion.div>
                  
                  <motion.h3
                    className="text-lg font-semibold text-gray-900"
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    {displayName}
                  </motion.h3>
                  
                  {user?.email && (
                    <motion.p
                      className="text-sm text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.18 }}
                    >
                      {user.email}
                    </motion.p>
                  )}
                  
                  {isAdmin && (
                    <motion.span 
                      className="mt-2 px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium flex items-center gap-1"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Shield className="w-3 h-3" />
                      Administrator
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Navigation Links */}
              <div className="py-2">
                {userLinks.map((item, index) => (
                  <motion.div
                    key={item.text}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileHover={{ x: 5 }}
                  >
                    <Link
                      href={item.link}
                      className={`flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors ${
                        item.isAdmin ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                      }}
                    >
                      {item.icon}
                      <span className={item.isAdmin ? 'font-medium text-orange-700' : ''}>
                        {item.text}
                      </span>
                      {item.isAdmin && (
                        <span className="ml-auto text-xs bg-orange-200 text-orange-700 px-2 py-1 rounded">
                          Admin
                        </span>
                      )}
                    </Link>
                  </motion.div>
                ))}

                {/* Logout Button */}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowDropdown(false);
                      setTimeout(() => handleLogout(), 100);
                    }}
                    className="cursor-pointer flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ backgroundColor: "#fef2f2" }}
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Mobile Sidebar Component
export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  isSignedIn = false,
  handleSignIn,
  handleLogout,
  user,
}) => {
  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
            className="fixed left-0 top-0 w-80 h-full max-w-[85vw] bottom-0 shadow-2xl z-[9999]"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-orange-600">
              <Logo />
              <button
                onClick={onClose}
                className="p-2 text-gray-200 hover:text-white hover:bg-orange-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-200" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="p-4 bg-orange-600 overflow-y-auto h-[calc(100%-80px)]">

              {/* User Section */}
              {isSignedIn && user && (
                <div className=" pt-4 border-gray-300">
                  <div className="flex items-center gap-3 p-3 mb-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{user.initial}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-gray-300 text-sm">{user.email}</p>
                    </div>
                  </div>
                  
                  {/* User Links */}
                  {userLinks.map((item) => (
                    <Link
                      key={item.text}
                      href={item.link}
                      className="flex items-center gap-3 p-3 text-gray-200 hover:bg-orange-700 rounded-lg transition-colors"
                      onClick={onClose}
                    >
                      {item.icon}
                      <span>{item.text}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Footer Links */}
              <div className="mt-8 pt-4 border-t border-gray-300">
                <Link
                  href="/privacy-policy"
                  className="block p-3 text-gray-200 hover:bg-orange-700 rounded-lg transition-colors"
                  onClick={onClose}
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/customer-support"
                  className="block p-3 text-gray-200 hover:bg-orange-700 rounded-lg transition-colors"
                  onClick={onClose}
                >
                  Help Center
                </Link>
                
                {/* Authentication Actions */}
                {isSignedIn ? (
                  <button
                    onClick={() => {
                      handleLogout?.();
                      onClose();
                    }}
                    className="flex items-center gap-3 w-full p-3 text-gray-200 hover:bg-orange-700 rounded-lg transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleSignIn?.();
                      onClose();
                    }}
                    className="flex items-center gap-3 w-full p-3 text-gray-200 hover:bg-orange-700 rounded-lg transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Desktop Header Component
export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  inputValue,
  setInputValue,
  placeholder,
  totalCartItems,
  handleCartOpen,
  isSignedIn,
  wishlistCount,
  showDropdown,
  setShowDropdown,
  handleSignIn,
  handleLogout,
  user,
}) => (
  <div className="hidden md:flex items-center justify-between">
    <Logo />

    <div className="flex-1 mx-8">
      <SearchBar
        inputValue={inputValue}
        setInputValue={setInputValue}
        placeholder={placeholder}
      />
    </div>

    <div className="flex items-center gap-4">
      <WishButton wishlistCount={wishlistCount} href="/account/wishlist" />
      <CartButton totalCartItems={totalCartItems} onClick={handleCartOpen} />
      <UserDropdown
        isSignedIn={isSignedIn}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        handleSignIn={handleSignIn}
        handleLogout={handleLogout}
        user={user}
      />
    </div>
  </div>
);

// Mobile Header Component
export const MobileHeader: React.FC<MobileHeaderProps> = ({
  inputValue,
  setInputValue,
  placeholder,
  totalCartItems,
  handleCartOpen,
  onMenuClick,
}) => (
  <div className="md:hidden">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1">
        <button className="p-2" onClick={onMenuClick}>
          <Menu className="w-6 h-6 text-gray-100" />
        </button>
        <Logo />
      </div>
      <CartButton totalCartItems={totalCartItems} onClick={handleCartOpen} />
    </div>

    <SearchBar
      inputValue={inputValue}
      setInputValue={setInputValue}
      placeholder={placeholder}
    />
  </div>
);
