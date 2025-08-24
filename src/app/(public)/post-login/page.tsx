"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useDispatch } from 'react-redux'
import { mergeGuestCart, fetchCart, setAuthenticated } from '@/app/store/slices/cartSlice'
import { toast } from 'react-toastify'
import { StorageUtil } from '@/lib/storageKeys'

interface PostLoginState {
  status: 'loading' | 'merging' | 'fetching' | 'success' | 'error'
  message: string
  retryCount: number
  error?: string
}

export default function PostLoginPage() {
  const [state, setState] = useState<PostLoginState>({
    status: 'loading',
    message: 'Preparing your account...',
    retryCount: 0
  })
  
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const dispatch = useDispatch()

  const updateState = (updates: Partial<PostLoginState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const handlePostLoginSetup = async (attempt = 1): Promise<void> => {
    console.log(`🎯 Starting post-login setup (attempt ${attempt})...`)
    
    try {
      if (!user?.id) {
        throw new Error("No user ID available")
      }

      StorageUtil.debugStorage()
      
      // FIXED: Get guest ID before any user mode changes
      const currentGuestId = StorageUtil.getGuestIdForMerge()
      
      console.log("🔍 Post-login state check:", { 
        userId: user.id,
        hasGuestCart: !!currentGuestId,
        attempt,
        guestId: currentGuestId
      })

      // FIXED: Set user mode but preserve guest ID for merging
      StorageUtil.setUserMode(user.id)

      // Update Redux authentication state
      dispatch(setAuthenticated({
        isAuthenticated: true,
        userId: user.id
      }))

      if (!currentGuestId) {
        // No guest cart to merge, just fetch user's existing cart
        updateState({
          status: 'fetching',
          message: 'Loading your saved cart...'
        })

        const fetchResult = await dispatch(fetchCart({ 
          userId: user.id, 
          guestId: null 
        }))
        
        if (fetchCart.fulfilled.match(fetchResult)) {
          updateState({
            status: 'success',
            message: 'Welcome back! Your cart has been loaded.'
          })
          
          toast.success("Welcome back!")
          window.dispatchEvent(new Event('refreshCart'))
          setTimeout(() => router.push('/'), 500)
          return
        } else {
          throw new Error(fetchResult.payload as string || "Failed to fetch cart")
        }
      }

      // Guest cart exists - proceed with merge
      updateState({
        status: 'merging',
        message: 'Merging your cart items...'
      })

      console.log("🔄 Merging guest cart with user cart...")
      
      const mergeResult = await dispatch(mergeGuestCart({ userId: user.id }))
      
      if (mergeGuestCart.fulfilled.match(mergeResult)) {
        console.log("✅ Cart merge completed successfully")
        
        updateState({
          status: 'fetching',
          message: 'Finalizing your cart...'
        })

        // Fetch updated cart after merge
        const fetchResult = await dispatch(fetchCart({ 
          userId: user.id, 
          guestId: null 
        }))
        
        if (fetchCart.fulfilled.match(fetchResult)) {
          updateState({
            status: 'success',
            message: 'Your cart items have been saved!'
          })
          
          toast.success("Your cart items have been saved!")
          window.dispatchEvent(new Event('refreshCart'))
          setTimeout(() => router.push('/'), 500)
          return
        } else {
          console.warn("⚠️ Cart merge succeeded but fetch failed")
          toast.success("Your cart items have been saved!")
          setTimeout(() => router.push('/'), 500)
          return
        }
      } else {
        const errorMessage = mergeResult.payload as string || "Cart merge failed"
        throw new Error(errorMessage)
      }
      
    } catch (err: any) {
      console.error(`❌ Post-login setup failed (attempt ${attempt}):`, err)
      
      const errorMessage = err?.message || err?.payload || "Failed to set up your account"
      const isRetryableError = attempt < 3 && (
        errorMessage.includes('network') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('P2002')
      )
      
      if (isRetryableError) {
        const retryDelay = Math.min(attempt * 1000, 3000)
        console.log(`🔄 Retrying post-login setup in ${retryDelay}ms...`)
        
        updateState({
          status: 'loading',
          message: `Retrying... (attempt ${attempt + 1}/3)`,
          retryCount: attempt
        })
        
        setTimeout(() => {
          handlePostLoginSetup(attempt + 1)
        }, retryDelay)
        return
      }
      
      updateState({
        status: 'error',
        message: 'Having trouble setting up your account',
        error: errorMessage
      })
      
      // Attempt fallback
      if (user?.id) {
        console.log("🔄 Attempting fallback cart fetch...")
        try {
          StorageUtil.switchToUserMode(user.id) // Now safe to clear guest ID
          const fallbackResult = await dispatch(fetchCart({ 
            userId: user.id, 
            guestId: null 
          }))
          
          if (fetchCart.fulfilled.match(fallbackResult)) {
            toast.warning("Some cart items may be missing, but your account is ready")
            setTimeout(() => router.push('/'), 1500)
            return
          }
        } catch (fallbackError) {
          console.error("❌ Fallback cart fetch also failed:", fallbackError)
        }
      }
      
      toast.error("Please try signing in again")
    }
  }

  const handleRetry = () => {
    updateState({
      status: 'loading',
      message: 'Retrying...',
      retryCount: 0,
      error: undefined
    })
    handlePostLoginSetup()
  }

  const handleContinueAnyway = () => {
    if (user?.id) {
      StorageUtil.switchToUserMode(user.id)
      dispatch(setAuthenticated({
        isAuthenticated: true,
        userId: user.id
      }))
    }
    toast.info("Continuing without cart merge")
    router.push('/')
  }

  useEffect(() => {
    if (!isLoaded) return

    if (user?.id) {
      console.log("🎉 Post-login page loaded for user:", user.id)
      handlePostLoginSetup()
    } else {
      console.log("❌ No user found, redirecting to sign-in")
      toast.error("Please sign in to continue")
      router.push('/sign-in')
    }
  }, [isLoaded, user?.id])

  // Rest of component remains the same...
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const getStatusConfig = () => {
    switch (state.status) {
      case 'loading':
      case 'merging':
      case 'fetching':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-600',
          showSpinner: true
        }
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-600',
          showSpinner: false
        }
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-600',
          showSpinner: false
        }
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          showSpinner: true
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
            {user?.fullName && (
              <p className="text-gray-600">Hi, {user.fullName}</p>
            )}
          </div>
          
          <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-md p-4`}>
            <div className="flex items-center justify-center">
              {statusConfig.showSpinner && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
              )}
              <p className={`${statusConfig.textColor} font-medium`}>
                {state.message}
              </p>
            </div>
            
            {state.retryCount > 0 && state.status === 'loading' && (
              <p className="text-sm text-blue-500 mt-2">
                Attempt {state.retryCount + 1} of 3
              </p>
            )}
          </div>

          {state.status === 'error' && (
            <div className="space-y-3">
              {state.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {state.error}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={handleContinueAnyway}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm font-medium"
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          )}

          {state.status === 'success' && (
            <div className="flex items-center justify-center text-green-600">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Redirecting...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}