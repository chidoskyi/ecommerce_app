'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/userStore'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRole?: 'USER' | 'MODERATOR' | 'ADMIN'
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRole,
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, tokens } = useUserStore()

  useEffect(() => {
    // If we require auth but user is not authenticated
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // If we require a specific role but user doesn't have it
    if (requireAuth && isAuthenticated && requiredRole && user?.role !== requiredRole) {
      // Check if user has higher privileges
      const roleHierarchy = { USER: 0, MODERATOR: 1, ADMIN: 2 }
      const userRoleLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0
      const requiredRoleLevel = roleHierarchy[requiredRole]

      if (userRoleLevel < requiredRoleLevel) {
        router.push('/unauthorized')
        return
      }
    }

    // If we don't require auth but user is authenticated, redirect to dashboard
    if (!requireAuth && isAuthenticated) {
      router.push('/dashboard')
      return
    }
  }, [isAuthenticated, isLoading, user, requireAuth, requiredRole, router, redirectTo])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If we require auth and user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null
  }

  // If we require a specific role and user doesn't have it, don't render children
  if (requireAuth && isAuthenticated && requiredRole && user?.role !== requiredRole) {
    const roleHierarchy = { USER: 0, MODERATOR: 1, ADMIN: 2 }
    const userRoleLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole]

    if (userRoleLevel < requiredRoleLevel) {
      return null
    }
  }

  // If we don't require auth but user is authenticated, don't render children
  if (!requireAuth && isAuthenticated) {
    return null
  }

  return <>{children}</>
}