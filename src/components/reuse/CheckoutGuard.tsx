"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@clerk/nextjs';
import { Loader2, Lock, User } from 'lucide-react';
import CheckoutComponent from '@/app/(public)/checkout/page';

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, userId } = useAuth();
  const { isSignedIn, isLoaded: clerkLoaded, user } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Checkout page - checking auth:', {
        isAuthenticated,
        authLoading,
        userId,
        isSignedIn,
        clerkLoaded,
        clerkUserId: user?.id
      });

      // Wait for loading to complete
      if (authLoading || !clerkLoaded) {
        return;
      }

      // Check authentication
      if (!isAuthenticated || !isSignedIn || !user?.id) {
        console.log('🔒 Not authenticated, redirecting to sign-in');
        
        // Store current path for redirect after login
        sessionStorage.setItem('redirect_after_login', '/checkout');
        
        router.push('/sign-in?redirect=checkout');
        return;
      }

      console.log('✅ Authenticated user accessing checkout');
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, authLoading, userId, isSignedIn, clerkLoaded, user?.id, router]);

  // Show loading state
  if (isChecking || authLoading || !clerkLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Preparing your checkout...
          </h2>
          <p className="text-gray-600">
            We&apos;re verifying your account details
          </p>
        </div>
      </div>
    );
  }

  // Show not authenticated state (fallback)
  if (!isAuthenticated || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access checkout
          </p>
          <button
            onClick={() => router.push('/sign-in')}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <User className="w-4 h-4" />
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Render actual checkout component
  return (
    <div>
      {/* Your actual checkout component goes here */}
      <CheckoutComponent />
    </div>
  );
}