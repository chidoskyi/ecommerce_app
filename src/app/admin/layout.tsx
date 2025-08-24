// app/admin/layout.tsx (Updated to use Redux instead of API call)
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext" // Adjust path as needed
import AdminLayoutClient from "./AdminLayoutClient"
import { useDispatch, useSelector } from 'react-redux'
import { fetchUser, selectUser, selectIsLoading, selectError, selectIsAdmin } from '@/app/store/slices/userSlice'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, token, userId } = useAuth()
  const dispatch = useDispatch()
  
  // Redux state
  const user = useSelector(selectUser)
  const isUserLoading = useSelector(selectIsLoading)
  const userError = useSelector(selectError)
  const isAdmin = useSelector(selectIsAdmin)
  
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false)

  useEffect(() => {
    const checkAdminAccess = async () => {
      console.log('🔍 Admin check - Auth state:', {
        authLoading,
        isAuthenticated,
        userId,
        hasToken: !!token,
        tokenLength: token?.length
      });

      // Wait for auth to be ready
      if (authLoading) {
        console.log('⏳ Still loading auth...');
        return;
      }

      // Redirect if not authenticated
      if (!isAuthenticated || !userId || !token) {
        console.log('❌ Not authenticated, redirecting to sign-in', {
          isAuthenticated,
          hasUserId: !!userId,
          hasToken: !!token
        });
        router.push("/sign-in")
        return
      }

      // If we don't have user data yet, fetch it
      if (!user && !isUserLoading && !userError) {
        console.log('🔐 Fetching user data from Redux...');
        dispatch(fetchUser() as any);
        return;
      }

      // If we have an error, handle it
      if (userError) {
        console.error('❌ Error fetching user:', userError);
        setHasCheckedAccess(true);
        return;
      }

      // If still loading user data, wait
      if (isUserLoading) {
        console.log('⏳ Still loading user data...');
        return;
      }

      // If we have user data, check admin access
      if (user) {
        console.log('✅ User data received:', {
          id: user.id,
          email: user.email,
          role: user.role
        });

        // Check if user has admin role
        if (!isAdmin) {
          console.log('❌ User is not admin, redirecting to home');
          router.push("/")
          return
        }

        console.log('✅ Admin access confirmed');
        setHasCheckedAccess(true);
      }
    }

    checkAdminAccess()
  }, [isAuthenticated, authLoading, token, userId, user, isUserLoading, userError, isAdmin, router, dispatch])

  // Show loading while checking authentication or fetching user data
  if (authLoading || isUserLoading || !hasCheckedAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-700"></div>
        <p className="ml-4 text-orange-500">Verifying admin access...</p>
      </div>
    )
  }

  // Show error state for debugging
  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 mb-4">Access Denied: {userError}</div>
        <div className="text-sm text-gray-600 mb-4">
          Debug info:
          <pre className="bg-gray-100 p-2 rounded mt-2">
            {JSON.stringify({ 
              isAuthenticated, 
              hasUserId: !!userId, 
              hasToken: !!token,
              userId: userId?.substring(0, 10) + '...', // Partial ID for debugging
              userRole: user?.role || 'No role data'
            }, null, 2)}
          </pre>
        </div>
        <button 
          onClick={() => {
            setHasCheckedAccess(false);
            dispatch(fetchUser() as any);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
        >
          Retry
        </button>
        <button 
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go Home
        </button>
      </div>
    )
  }

  // Don't render content while redirecting or if no user
  if (!isAuthenticated || !userId || !user) {
    return null
  }

  // Final check - don't render if not admin (though this should be redundant)
  if (!isAdmin) {
    return null
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}