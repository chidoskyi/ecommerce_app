'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage(data.message)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Verification failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred during verification')
    }
  }

  const resendVerification = async () => {
    setIsResending(true)
    try {
      // You would need to implement this based on your needs
      // For now, just show a message
      setMessage('Please contact support to resend verification email')
    } catch (error) {
      setMessage('Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
              {status === 'loading' && (
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
              {status === 'error' && (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {status === 'loading' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Please wait while we verify your email address.'}
              {status === 'success' && 'Your email has been successfully verified. You will be redirected to login shortly.'}
              {status === 'error' && 'There was a problem verifying your email address.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`p-4 rounded-md ${
                status === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-3">
              {status === 'success' && (
                <Link href="/login">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Continue to Login
                  </Button>
                </Link>
              )}

              {status === 'error' && (
                <div className="space-y-2">
                  <Button 
                    onClick={resendVerification}
                    disabled={isResending}
                    className="w-full"
                    variant="outline"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                  <Link href="/register">
                    <Button variant="outline" className="w-full">
                      Back to Registration
                    </Button>
                  </Link>
                </div>
              )}

              <Link href="/">
                <Button variant="ghost" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}