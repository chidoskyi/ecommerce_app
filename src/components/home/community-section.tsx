'use client';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Container from "../reuse/Container"
import { Mail } from "lucide-react"
import { useState } from "react"
import axios from "axios" // Import axios

export default function CommunitySection() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    setError("")

    try {
      // Use axios instead of fetch
      const response = await axios.post('/api/newsletter', { email })

      setIsSuccess(true)
      setEmail("")
      
      // Hide success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000)
      
    } catch (error: any) {
      // Axios error handling
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Something went wrong. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="bg-gray-50 py-12 bg-white mb-10 shadow-sm">
      <section className="">
        <div className="flex flex-col md:flex-row gap-6 justify-between md:items-center px-4 md:px-0">
          <div className="flex flex-col gap-3 max-w-md">
            <h1 className="text-2xl font-semibold text-gray-900">Join The FeedMe Community</h1>
            <p className="text-sm text-gray-600">
              Sign up and be the first to learn about updates from FeedMe
            </p>
          </div>
          
          <form 
            onSubmit={handleSubmit}
            className="relative w-full md:w-[40rem]"
          >
            <div className="relative">
              <Input
                className="pl-10 pr-32 py-6 rounded-lg placeholder:text-sm w-full h-12 md:h-14 border border-gray-300 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-orange-600"
                placeholder="Enter your email address..."
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("") // Clear error when user types
                }}
                required
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Button
                type="submit"
                className="cursor-pointer absolute right-2 top-1/2 transform -translate-y-1/2 bg-orange-600 hover:bg-orange-700 text-white rounded-md px-2 py-1 text-xs md:text-sm"
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? "Submitting..." : "Join Our Community"}
              </Button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {isSuccess && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
            Thank you for joining our community! We&apos;ll be in touch soon.
          </div>
        )}
      </section>
    </Container>
  )
}