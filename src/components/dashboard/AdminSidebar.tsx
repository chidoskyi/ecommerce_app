"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  X,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SidebarProps } from "@/types";



export function Sidebar({
  onClose,
  onNavigate,
  currentPage,
  onLogout,
}: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const routes = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Users",
      icon: Users,
      path: "users",
    },
    {
      name: "Products",
      icon: Package,
      path: "products",
      submenu: [
        { name: "All Products", path: "products" },
        { name: "Add Product", path: "add-products" },
        { name: "Categories", path: "categories" },
      ],
    },
    // {
    //   name: "Invoices",
    //   path: "invoices",
    //   icon: FileText,
    // },
    // {
    //   name: "Customers",
    //   path: "customers",
    //   icon: Users,
    // },
    {
      name: "Order List",
      path: "orders",
      icon: ClipboardList,
    },
    {
      name: "Reviews",
      path: "reviews",
      icon: MessageSquare,
    },
    // {
    //   name: "Invoices",
    //   path: "invoices",
    //   icon: FileText,
    // },
    // {
    //   name: "Settings",
    //   path: "settings",
    //   icon: Settings,
    // },
  ];

  const handleNavigation = (path: string) => {
    onNavigate(path);
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <div className="w-80 h-screen bg-slate-900 border-r border-slate-700 flex flex-col shadow-2xl">
      <div className="p-6 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 mr-3 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"
                  fill="white"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                FeedMe
              </h1>
              <p className="text-xs text-slate-400 font-medium">INDUSTRIAL</p>
            </div>
            <Link
              href="/"
              className="ml-4 text-sm text-blue-400 hover:underline"
            >
              Home
            </Link>
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {routes.map((route) => {
          const isActive = currentPage === route.path;
          const hasSubmenu = route.submenu && route.submenu.length > 0;

          return (
            <div key={route.path} className="space-y-1">
              {hasSubmenu ? (
                <>
                  <button
                    onClick={() => toggleMenu(route.path)}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center">
                      <route.icon
                        className={cn(
                          "mr-3 h-5 w-5",
                          isActive ? "text-white" : "text-slate-400"
                        )}
                      />
                      {route.name}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        openMenus[route.path] ? "rotate-180" : ""
                      )}
                    />
                  </button>
                  {openMenus[route.path] && (
                    <div className="pl-6 space-y-1 mt-2 border-l-2 border-slate-700 ml-4">
                      {route.submenu.map((subItem) => {
                        const isSubActive = currentPage === subItem.path;
                        return (
                          <button
                            key={subItem.path}
                            onClick={() => handleNavigation(subItem.path)}
                            className={cn(
                              "flex items-center cursor-pointer w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                              isSubActive
                                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:pl-6"
                            )}
                          >
                            <div className="w-2 h-2 bg-current rounded-full mr-3 opacity-60"></div>
                            {subItem.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => handleNavigation(route.path)}
                  className={cn(
                    "flex items-center cursor-pointer w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700"
                  )}
                >
                  <route.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive ? "text-white" : "text-slate-400"
                    )}
                  />
                  {route.name}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <Button
          variant="outline"
          className="w-full justify-start font-semibold cursor-pointer border-slate-600 text-slate-900 hover:bg-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200"
          size="sm"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
