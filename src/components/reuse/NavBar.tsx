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
} from "@/lib/types";
import { categoriesData } from "@/data/categories";
import { CartButtonProps } from "@/types/carts";
import { UserDropdownProps } from "@/types/users";
import SearchDropdown from "./SearchDropDown";
import { useProducts } from "@/app/store/slices/productSlice";

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
      <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
        <span className="text-white font-bold text-sm">f</span>
      </div>
      <span className="text-xl font-bold text-gray-900">eedMe</span>
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

// User Dropdown Component
export const UserDropdown: React.FC<UserDropdownProps> = ({
  isSignedIn,
  showDropdown,
  setShowDropdown,
  handleSignIn,
  handleLogout,
  user,
}) => {
  const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState<NodeJS.Timeout | null>(null);

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
    }, 100); // Small delay
    setMouseLeaveTimeout(timeout);
  };

  if (!isSignedIn) {
    return (
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          className="rounded-full text-gray-100 bg-transparent cursor-pointer"
          onClick={handleSignIn}
        >
          Sign In
        </Button>
      </motion.div>
    );
  }

  
  const displayName = user?.name || "User";
  const displayInitial = user?.initial || "U";

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
          className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center"
          whileHover={{ rotate: 10 }}
          whileTap={{ rotate: -10 }}
        >
          <span className="text-white font-bold text-sm">{displayInitial}</span>
        </motion.div>

        {/* 👇 User Icon (visible below md) */}
        <User className="block lg:hidden w-5 h-5 text-white" />

        {/* 👇 Display name (hidden below md) */}
        <span className="hidden lg:inline text-sm">Hello, {displayName}</span>

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
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex flex-col items-center">
                  <motion.div
                    className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-3"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span className="text-white font-bold text-xl">
                      {displayInitial}
                    </span>
                  </motion.div>
                  <motion.h3
                    className="text-lg font-semibold text-gray-900"
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    {displayName}
                  </motion.h3>
                </div>
              </div>

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
                      className="flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                      }}
                    >
                      {item.icon}
                      <span>{item.text}</span>
                    </Link>
                  </motion.div>
                ))}

                <div className="border-t border-gray-100 mt-2 pt-2">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowDropdown(false);
                      setTimeout(() => handleLogout(), 100);
                    }}
                    className="cursor-pointer flex items-center gap-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
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
              <nav className="mt-4">
                <ul className="space-y-2">
                  {categoriesData.map((category, index) => (
                    <li key={index}>
                      <Link
                        href={`/category/${category.slug}`}
                        key={category.name}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-200"
                        onClick={(e) => {
                          console.log(`Navigate to ${category.name}`);
                          onClose(); // Close the sidebar
                        }}
                      >
                        <span>{category.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* User Section */}
              {isSignedIn && user && (
                <div className="mt-6 pt-4 border-t border-gray-300">
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
