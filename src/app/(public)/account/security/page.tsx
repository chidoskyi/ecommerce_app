"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"


export default function Security() {
  return (
    <Card className="border-gray-200">
      <CardHeader>
         <CardTitle className="flex item-center justify-start gap-2 mb-5"><ShieldCheck /><h1 className="">Security Settings</h1></CardTitle>
        <CardDescription>Manage your account security and privacy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Change Password</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" className="w-full rounded-md px-3 py-1 !text-[16px] h-14 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border pl-10 h-10 sm:h-12 border-gray-200 focus:border-[#1B6013] focus:ring-orange-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password"  className="w-full rounded-md px-3 py-1 !text-[16px] h-14 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border pl-10 h-10 sm:h-12 border-gray-200 focus:border-[#1B6013] focus:ring-orange-600"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" className="w-full rounded-md px-3 py-1 !text-[16px] h-14 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border pl-10 h-10 sm:h-12 border-gray-200 focus:border-[#1B6013] focus:ring-orange-600"/>
            </div>
            <Button variant="outline" className="bg-orange-600 text-white cursor-pointer hover:bg-orange-700">Update Password</Button>
          </div>
        </div>

        {/* <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-factor authentication</Label>
                <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Switch />
            </div>
            <Button variant="outline">Set Up Two-Factor Authentication</Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Account Activity</h3>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium">Recent Logins</h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">New York, United States</p>
                    <p className="text-xs text-muted-foreground">Today, 10:30 AM • Chrome on Windows</p>
                  </div>
                  <Badge>Current</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">New York, United States</p>
                    <p className="text-xs text-muted-foreground">Yesterday, 8:15 PM • Safari on macOS</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">New York, United States</p>
                    <p className="text-xs text-muted-foreground">Mar 15, 2025, 2:20 PM • Chrome on iOS</p>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline">View All Activity</Button>
          </div>
        </div>

        <Separator /> */}



        {/* <div className="space-y-4">
          <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h4 className="font-medium text-red-600">Delete Account</h4>
            <p className="text-sm text-red-600 mt-1">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button variant="destructive" className="mt-4 cursor-pointer">
              Delete Account
            </Button>
          </div>
        </div> */}
      </CardContent>
    </Card>
  )
}