"use client"

import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const testimonials = [
  {
    name: "Chidi Okafor",
    text: "Easy to manage my grocery stock with seamless payments integration.",
  },
  {
    name: "Amaka Nwosu", 
    text: "Quick delivery, affordable prices, and a user-friendly design.",
  },
  {
    name: "Uche Obi",
    text: "Secure sign-in with Clerk and a smooth, fast checkout process.",
  },
  {
    name: "Ngozi Eze",
    text: "Fresh groceries daily and easy navigation with great deals.",
  },
  {
    name: "Ifeanyi Okoro",
    text: "Reliable platform with fast delivery and multiple payment options.",
  },
]

export default function Page() {
  const [current, setCurrent] = useState(0)
  const searchParams = useSearchParams()
  
  // Get the redirect_url from search parameters
  const redirect_url = searchParams.get('redirect_url')
  const redirectUrl = redirect_url ? decodeURIComponent(redirect_url) : '/'

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Welcome back to Shop Grocery Online Store
              </p>
            </div>
            
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 
                    "bg-green-600 hover:bg-green-700 text-sm normal-case",
                  card: "shadow-lg",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  footerAction: "hidden", // Hide default footer to add custom forgot password link
                },
              }}
              forceRedirectUrl={redirectUrl}
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
            />
            
            {/* Custom Forgot Password Link */}
            <div className="text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-green-600 hover:text-green-500 font-medium"
              >
                Forgot your password?
              </Link>
            </div>
            
            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  href="/sign-up" 
                  className="font-medium text-green-600 hover:text-green-500"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Full Image with Testimonial Overlay */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <Image 
            src="/shop-grocery.jpg" 
            alt="Sign in" 
            fill
            className="object-cover"
            priority
          />
          {/* Gray Overlay */}
          <div className="absolute inset-0 bg-black/50"></div>

          {/* Testimonial Section */}
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-center">
            <div className="flex flex-col items-center space-y-3">
              <p className='text-white text-lg italic'>&quot;{testimonials[current].text}&quot;</p>
              <h3 className="text-white font-semibold">-{testimonials[current].name}</h3>
            </div>

            {/* Navigation Bullets */}
            <div className="flex justify-center mt-4 space-x-2 cursor-pointer">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  className={`w-3 h-3 rounded-full cursor-pointer ${
                    current === index ? "bg-orange-600" : "bg-gray-400"
                  }`}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}