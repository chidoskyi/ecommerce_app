'use client'

import { UserButton as ClerkUserButton, useUser, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { User, LogIn } from 'lucide-react'

export default function UserButton() {
  const { isSignedIn, user } = useUser()

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant="outline" size="sm">
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </Button>
      </SignInButton>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 hidden sm:block">
        Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
      </span>
      <ClerkUserButton 
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
            userButtonPopoverCard: "shadow-lg border",
            userButtonPopoverActionButton: "hover:bg-gray-50",
          }
        }}
        afterSignOutUrl="/"
      />
    </div>
  )
}