'use client'

import React, { useEffect, useState } from 'react'
import { useAuth, useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Lock, Key } from 'lucide-react'
import Image from 'next/image'

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [successfulCreation, setSuccessfulCreation] = useState(false)
  const [secondFactor, setSecondFactor] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { isLoaded, signIn, setActive } = useSignIn()

  useEffect(() => {
    if (isSignedIn) {
      router.push('/')
    }
  }, [isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  // Send the password reset code to the user's email
  async function create(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn?.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      })
      setSuccessfulCreation(true)
    } catch (err: any) {
      console.error('Error sending reset code:', err.errors?.[0]?.longMessage)
      setError(err.errors?.[0]?.longMessage || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Reset the user's password
  async function reset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      })

      if (result?.status === 'needs_second_factor') {
        setSecondFactor(true)
      } else if (result?.status === 'complete') {
        // Set the active session to the newly created session (user is now signed in)
        setActive({ session: result.createdSessionId })
        router.push('/')
      }
    } catch (err: any) {
      console.error('Error resetting password:', err.errors?.[0]?.longMessage)
      setError(err.errors?.[0]?.longMessage || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        {/* Left side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                {!successfulCreation ? 'Reset your password' : 'Enter new password'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {!successfulCreation 
                  ? 'Enter your email address and we\'ll send you a reset code'
                  : 'Enter the code from your email and your new password'
                }
              </p>
            </div>

            <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
              <form onSubmit={!successfulCreation ? create : reset} className="space-y-6">
                {!successfulCreation ? (
                  <>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                      </label>
                      <div className="mt-1 relative">
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                        />
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="group cursor-pointer relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          'Send reset code'
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                        Reset code
                      </label>
                      <div className="mt-1 relative">
                        <input
                          id="code"
                          name="code"
                          type="text"
                          required
                          className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                          placeholder="Enter the code from your email"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          disabled={loading}
                        />
                        <Key className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        New password
                      </label>
                      <div className="mt-1 relative">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          required
                          className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                          placeholder="Enter your new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                        />
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={loading || !code || !password}
                        className="group cursor-pointer relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          'Reset password'
                        )}
                      </button>
                    </div>
                  </>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {secondFactor && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-700">
                      Two-factor authentication is required. Please contact support for assistance.
                    </p>
                  </div>
                )}

                {successfulCreation && !secondFactor && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                    <p className="text-sm text-orange-700">
                      Reset code sent to {email}. Please check your inbox.
                    </p>
                  </div>
                )}
              </form>

              <div className="mt-6">
                <Link 
                  href="/sign-in"
                  className="flex items-center justify-center text-sm text-orange-600 hover:text-orange-500"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Full Image with Testimonial Overlay */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <Image 
            src="/shop-grocery.jpg" 
            alt="Reset password" 
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