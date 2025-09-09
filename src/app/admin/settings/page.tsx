"use client"

import { JSX, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-toastify"
import { Bell, Shield } from "lucide-react"
import { NotificationSettings, SecurityData } from "@/types"



type TabValue = "security" | "notifications"

export default function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabValue>("security")
  const [loading, setLoading] = useState<boolean>(false)

  const [securityData, setSecurityData] = useState<SecurityData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    orderUpdates: true,
    newCustomers: true,
    productUpdates: false,
  })

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success("Password updated successfully")
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Error updating password:", error)
      toast.error("Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean): void => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const saveNotificationSettings = async (): Promise<void> => {
    setLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success("Notification settings updated")
    } catch (error) {
      console.error("Error updating notification settings:", error)
      toast.error("Failed to update notification settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as typeof activeTab)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="security" className="flex items-center gap-2 cursor-pointer">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 cursor-pointer">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={securityData.currentPassword}
                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={securityData.newPassword}
                    onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                  />
                </div>

                <div className="flex justify-end">
                  <Button className="flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25" variant="outline" type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-medium">Authenticator App</h4>
                  <p className="text-sm text-muted-foreground">Use an authenticator app to generate one-time codes</p>
                </div>
                <Button variant="outline">Setup</Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-medium">Text Message</h4>
                  <p className="text-sm text-muted-foreground">Receive codes via SMS</p>
                </div>
                <Button variant="outline">Setup</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-medium">Session Timeout</h4>
                  <p className="text-sm text-muted-foreground">Automatically log out after a period of inactivity</p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-medium">Login History</h4>
                  <p className="text-sm text-muted-foreground">View your recent login activity</p>
                </div>
                <Button variant="outline">View History</Button>
              </div>
            </CardContent>
          </Card> */}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Email Notifications</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email notifications</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="order-updates">Order Updates</Label>
                    <p className="text-sm text-muted-foreground">Receive updates on order status changes</p>
                  </div>
                  <Switch
                    id="order-updates"
                    checked={notificationSettings.orderUpdates}
                    onCheckedChange={(checked) => handleNotificationChange("orderUpdates", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-customers">New Customers</Label>
                    <p className="text-sm text-muted-foreground">Be notified when new customers register</p>
                  </div>
                  <Switch
                    id="new-customers"
                    checked={notificationSettings.newCustomers}
                    onCheckedChange={(checked) => handleNotificationChange("newCustomers", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="product-updates">Product Updates</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications about product changes</p>
                  </div>
                  <Switch
                    id="product-updates"
                    checked={notificationSettings.productUpdates}
                    onCheckedChange={(checked) => handleNotificationChange("productUpdates", checked)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r ml-auto from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25" onClick={saveNotificationSettings} disabled={loading}>
                {loading ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Switch } from "@/components/ui/switch"
// import { Textarea } from "@/components/ui/textarea"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { toast } from "react-toastify"
// import { Bell, Shield, User, Palette } from "lucide-react"

// export default function SettingsPage() {
//   const [activeTab, setActiveTab] = useState("profile")
//   const [loading, setLoading] = useState(false)
//   const [profileData, setProfileData] = useState({
//     name: "John Doe",
//     email: "john@example.com",
//     bio: "Admin and e-commerce manager with 5+ years of experience.",
//     avatar: "/placeholder.svg?height=100&width=100",
//   })

//   const [securityData, setSecurityData] = useState({
//     currentPassword: "",
//     newPassword: "",
//     confirmPassword: "",
//   })

//   const [notificationSettings, setNotificationSettings] = useState({
//     emailNotifications: true,
//     orderUpdates: true,
//     newCustomers: true,
//     productUpdates: false,
//     marketingEmails: false,
//     securityAlerts: true,
//   })

//   const [appearanceSettings, setAppearanceSettings] = useState({
//     theme: "light",
//     sidebarCompact: false,
//     highContrast: false,
//     animationsReduced: false,
//   })

//   const handleProfileUpdate = async (e) => {
//     e.preventDefault()
//     setLoading(true)

//     try {
//       // In a real app, you would call your API
//       // await api.updateProfile(profileData)

//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1000))

//       toast.success("Profile updated successfully")
//     } catch (error) {
//       console.error("Error updating profile:", error)
//       toast.error("Failed to update profile")
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handlePasswordChange = async (e) => {
//     e.preventDefault()

//     if (securityData.newPassword !== securityData.confirmPassword) {
//       toast.error("New passwords do not match")
//       return
//     }

//     setLoading(true)

//     try {
//       // In a real app, you would call your API
//       // await api.updatePassword(securityData)

//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1000))

//       toast.success("Password updated successfully")
//       setSecurityData({
//         currentPassword: "",
//         newPassword: "",
//         confirmPassword: "",
//       })
//     } catch (error) {
//       console.error("Error updating password:", error)
//       toast.error("Failed to update password")
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleNotificationChange = (key, value) => {
//     setNotificationSettings((prev) => ({
//       ...prev,
//       [key]: value,
//     }))
//   }

//   const handleAppearanceChange = (key, value) => {
//     setAppearanceSettings((prev) => ({
//       ...prev,
//       [key]: value,
//     }))
//   }

//   const saveNotificationSettings = async () => {
//     setLoading(true)

//     try {
//       // In a real app, you would call your API
//       // await api.updateNotificationSettings(notificationSettings)

//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1000))

//       toast.success("Notification settings updated")
//     } catch (error) {
//       console.error("Error updating notification settings:", error)
//       toast.error("Failed to update notification settings")
//     } finally {
//       setLoading(false)
//     }
//   }

//   const saveAppearanceSettings = async () => {
//     setLoading(true)

//     try {
//       // In a real app, you would call your API
//       // await api.updateAppearanceSettings(appearanceSettings)

//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1000))

//       toast.success("Appearance settings updated")
//     } catch (error) {
//       console.error("Error updating appearance settings:", error)
//       toast.error("Failed to update appearance settings")
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col space-y-2">
//         <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
//         <p className="text-muted-foreground">Manage your account settings and preferences</p>
//       </div>

//       <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
//         <TabsList className="grid grid-cols-4 w-full max-w-3xl">
//           <TabsTrigger value="profile" className="flex items-center gap-2">
//             <User className="h-4 w-4" />
//             <span className="hidden sm:inline">Profile</span>
//           </TabsTrigger>
//           <TabsTrigger value="security" className="flex items-center gap-2">
//             <Shield className="h-4 w-4" />
//             <span className="hidden sm:inline">Security</span>
//           </TabsTrigger>
//           <TabsTrigger value="notifications" className="flex items-center gap-2">
//             <Bell className="h-4 w-4" />
//             <span className="hidden sm:inline">Notifications</span>
//           </TabsTrigger>
//           <TabsTrigger value="appearance" className="flex items-center gap-2">
//             <Palette className="h-4 w-4" />
//             <span className="hidden sm:inline">Appearance</span>
//           </TabsTrigger>
//         </TabsList>

//         {/* Profile Tab */}
//         <TabsContent value="profile" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Profile Information</CardTitle>
//               <CardDescription>Update your account profile information and bio</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <form onSubmit={handleProfileUpdate} className="space-y-6">
//                 <div className="flex flex-col md:flex-row gap-6">
//                   <div className="flex flex-col items-center space-y-2">
//                     <Avatar className="h-24 w-24">
//                       <AvatarImage src={profileData.avatar} alt={profileData.name} />
//                       <AvatarFallback>
//                         {profileData.name
//                           .split(" ")
//                           .map((n) => n[0])
//                           .join("")
//                           .toUpperCase()}
//                       </AvatarFallback>
//                     </Avatar>
//                     <Button variant="outline" size="sm">
//                       Change Avatar
//                     </Button>
//                   </div>

//                   <div className="flex-1 space-y-4">
//                     <div className="grid gap-2">
//                       <Label htmlFor="name">Full Name</Label>
//                       <Input
//                         id="name"
//                         value={profileData.name}
//                         onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
//                       />
//                     </div>

//                     <div className="grid gap-2">
//                       <Label htmlFor="email">Email Address</Label>
//                       <Input
//                         id="email"
//                         type="email"
//                         value={profileData.email}
//                         onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
//                       />
//                     </div>

//                     <div className="grid gap-2">
//                       <Label htmlFor="bio">Bio</Label>
//                       <Textarea
//                         id="bio"
//                         placeholder="Tell us about yourself"
//                         value={profileData.bio}
//                         onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
//                         className="min-h-[100px]"
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 <div className="flex justify-end">
//                   <Button type="submit" disabled={loading}>
//                     {loading ? "Saving..." : "Save Changes"}
//                   </Button>
//                 </div>
//               </form>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Security Tab */}
//         <TabsContent value="security" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Password</CardTitle>
//               <CardDescription>Change your password</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <form onSubmit={handlePasswordChange} className="space-y-4">
//                 <div className="grid gap-2">
//                   <Label htmlFor="current-password">Current Password</Label>
//                   <Input
//                     id="current-password"
//                     type="password"
//                     value={securityData.currentPassword}
//                     onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
//                   />
//                 </div>

//                 <div className="grid gap-2">
//                   <Label htmlFor="new-password">New Password</Label>
//                   <Input
//                     id="new-password"
//                     type="password"
//                     value={securityData.newPassword}
//                     onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
//                   />
//                 </div>

//                 <div className="grid gap-2">
//                   <Label htmlFor="confirm-password">Confirm New Password</Label>
//                   <Input
//                     id="confirm-password"
//                     type="password"
//                     value={securityData.confirmPassword}
//                     onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
//                   />
//                 </div>

//                 <div className="flex justify-end">
//                   <Button type="submit" disabled={loading}>
//                     {loading ? "Updating..." : "Update Password"}
//                   </Button>
//                 </div>
//               </form>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle>Two-Factor Authentication</CardTitle>
//               <CardDescription>Add an extra layer of security to your account</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <div className="space-y-0.5">
//                   <h4 className="font-medium">Authenticator App</h4>
//                   <p className="text-sm text-muted-foreground">Use an authenticator app to generate one-time codes</p>
//                 </div>
//                 <Button variant="outline">Setup</Button>
//               </div>

//               <div className="flex items-center justify-between">
//                 <div className="space-y-0.5">
//                   <h4 className="font-medium">Text Message</h4>
//                   <p className="text-sm text-muted-foreground">Receive codes via SMS</p>
//                 </div>
//                 <Button variant="outline">Setup</Button>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle>Account Security</CardTitle>
//               <CardDescription>Manage your account security settings</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <div className="space-y-0.5">
//                   <h4 className="font-medium">Session Timeout</h4>
//                   <p className="text-sm text-muted-foreground">Automatically log out after a period of inactivity</p>
//                 </div>
//                 <Select defaultValue="30">
//                   <SelectTrigger className="w-[180px]">
//                     <SelectValue placeholder="Select timeout" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="15">15 minutes</SelectItem>
//                     <SelectItem value="30">30 minutes</SelectItem>
//                     <SelectItem value="60">1 hour</SelectItem>
//                     <SelectItem value="120">2 hours</SelectItem>
//                     <SelectItem value="never">Never</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="flex items-center justify-between">
//                 <div className="space-y-0.5">
//                   <h4 className="font-medium">Login History</h4>
//                   <p className="text-sm text-muted-foreground">View your recent login activity</p>
//                 </div>
//                 <Button variant="outline">View History</Button>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Notifications Tab */}
//         <TabsContent value="notifications" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Notification Preferences</CardTitle>
//               <CardDescription>Choose how you want to be notified</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-6">
//               <div className="space-y-4">
//                 <h4 className="font-medium">Email Notifications</h4>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="email-notifications">Email Notifications</Label>
//                     <p className="text-sm text-muted-foreground">Receive email notifications</p>
//                   </div>
//                   <Switch
//                     id="email-notifications"
//                     checked={notificationSettings.emailNotifications}
//                     onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="order-updates">Order Updates</Label>
//                     <p className="text-sm text-muted-foreground">Receive updates on order status changes</p>
//                   </div>
//                   <Switch
//                     id="order-updates"
//                     checked={notificationSettings.orderUpdates}
//                     onCheckedChange={(checked) => handleNotificationChange("orderUpdates", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="new-customers">New Customers</Label>
//                     <p className="text-sm text-muted-foreground">Be notified when new customers register</p>
//                   </div>
//                   <Switch
//                     id="new-customers"
//                     checked={notificationSettings.newCustomers}
//                     onCheckedChange={(checked) => handleNotificationChange("newCustomers", checked)}
//                   />
//                 </div>
//               </div>

//               <div className="space-y-4">
//                 <h4 className="font-medium">System Notifications</h4>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="product-updates">Product Updates</Label>
//                     <p className="text-sm text-muted-foreground">Receive notifications about product changes</p>
//                   </div>
//                   <Switch
//                     id="product-updates"
//                     checked={notificationSettings.productUpdates}
//                     onCheckedChange={(checked) => handleNotificationChange("productUpdates", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="marketing-emails">Marketing Emails</Label>
//                     <p className="text-sm text-muted-foreground">Receive marketing and promotional emails</p>
//                   </div>
//                   <Switch
//                     id="marketing-emails"
//                     checked={notificationSettings.marketingEmails}
//                     onCheckedChange={(checked) => handleNotificationChange("marketingEmails", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="security-alerts">Security Alerts</Label>
//                     <p className="text-sm text-muted-foreground">Receive alerts about security issues</p>
//                   </div>
//                   <Switch
//                     id="security-alerts"
//                     checked={notificationSettings.securityAlerts}
//                     onCheckedChange={(checked) => handleNotificationChange("securityAlerts", checked)}
//                   />
//                 </div>
//               </div>
//             </CardContent>
//             <CardFooter>
//               <Button onClick={saveNotificationSettings} disabled={loading} className="ml-auto">
//                 {loading ? "Saving..." : "Save Preferences"}
//               </Button>
//             </CardFooter>
//           </Card>
//         </TabsContent>

//         {/* Appearance Tab */}
//         <TabsContent value="appearance" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Appearance Settings</CardTitle>
//               <CardDescription>Customize how the dashboard looks</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-6">
//               <div className="space-y-4">
//                 <div className="grid gap-2">
//                   <Label htmlFor="theme">Theme</Label>
//                   <Select
//                     value={appearanceSettings.theme}
//                     onValueChange={(value) => handleAppearanceChange("theme", value)}
//                   >
//                     <SelectTrigger id="theme">
//                       <SelectValue placeholder="Select theme" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="light">Light</SelectItem>
//                       <SelectItem value="dark">Dark</SelectItem>
//                       <SelectItem value="system">System</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="sidebar-compact">Compact Sidebar</Label>
//                     <p className="text-sm text-muted-foreground">Use a more compact sidebar layout</p>
//                   </div>
//                   <Switch
//                     id="sidebar-compact"
//                     checked={appearanceSettings.sidebarCompact}
//                     onCheckedChange={(checked) => handleAppearanceChange("sidebarCompact", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="high-contrast">High Contrast</Label>
//                     <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
//                   </div>
//                   <Switch
//                     id="high-contrast"
//                     checked={appearanceSettings.highContrast}
//                     onCheckedChange={(checked) => handleAppearanceChange("highContrast", checked)}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <div className="space-y-0.5">
//                     <Label htmlFor="reduced-animations">Reduced Animations</Label>
//                     <p className="text-sm text-muted-foreground">Reduce or disable UI animations</p>
//                   </div>
//                   <Switch
//                     id="reduced-animations"
//                     checked={appearanceSettings.animationsReduced}
//                     onCheckedChange={(checked) => handleAppearanceChange("animationsReduced", checked)}
//                   />
//                 </div>
//               </div>
//             </CardContent>
//             <CardFooter>
//               <Button onClick={saveAppearanceSettings} disabled={loading} className="ml-auto">
//                 {loading ? "Saving..." : "Save Settings"}
//               </Button>
//             </CardFooter>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   )
// }
