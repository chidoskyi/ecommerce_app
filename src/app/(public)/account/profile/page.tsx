"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Cake,
  Mail,
  Shield,
  User as UserIcon,
  Upload,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

// Client-side utility functions to avoid server-only imports
const getUserDisplayName = (user: ClerkUser) => {
  if (!user) return "";
  return (
    user.fullName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.username ||
    "User"
  );
};


interface ClerkEmailAddress {
  emailAddress: string;
}

interface ClerkUser {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: ClerkEmailAddress[];
  imageUrl: string;
}



const getUserEmail = (user: ClerkUser) => {
  if (!user) return "";
  return (
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    ""
  );
};


// const getUserPhone = (user: any) => {
//   if (!user) return "";
//   return (
//     user.primaryPhoneNumber?.phoneNumber ||
//     user.phoneNumbers?.[0]?.phoneNumber ||
//     ""
//   );
// };

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function ProfilePage() {
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatar: "",
    dateOfBirth: "",
    role: "user",
  });
  const [originalFormData, setOriginalFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatar: "",
    dateOfBirth: "",
    role: "user",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [base64Image, setBase64Image] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // const user = clerkUser as unknown as ClerkUser;

  // Handle image upload to Clerk with base64 conversion
  const handleImageUpload = async (file: File) => {
    if (!clerkUser) return;

    setIsUploadingImage(true);
    try {
      console.log("🔄 Processing image...");

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size must be less than 2MB");
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Only JPG, PNG, and WebP files are supported");
      }

      // Convert to base64
      const base64String = await fileToBase64(file);
      setBase64Image(base64String);
      console.log("✅ Image converted to base64");

      // Upload to Clerk
      await clerkUser.setProfileImage({ file });
      console.log("✅ Image uploaded to Clerk successfully");

      // Also update database with the new image URL
      try {
        const response = await fetch("/api/sync-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar: clerkUser.imageUrl,
            avatarBase64: base64String, // Include base64 version
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth,
          }),
        });

        if (response.ok) {
          console.log("✅ Database updated with new image URL and base64");
        } else {
          console.warn("⚠️ Failed to update database with new image URL");
        }
      } catch (dbError) {
        console.warn("⚠️ Failed to sync image URL to database:", dbError);
      }

      alert("Profile image updated successfully!");
    } catch (error) {
      if (error instanceof Error) {
        console.error("❌ Error uploading image:", error);
        alert(`Failed to upload image: ${error.message}`);
      } else {
        console.error("❌ Error uploading image:", error);
        alert("Failed to upload image: An unknown error occurred.");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Remove profile image
  const handleRemoveImage = async () => {
    if (!clerkUser) return;

    if (!confirm("Are you sure you want to remove your profile image?")) {
      return;
    }

    setIsUploadingImage(true);
    try {
      console.log("🔄 Removing profile image from Clerk...");

      // Remove from Clerk
      await clerkUser.setProfileImage({ file: null });
      setBase64Image("");

      console.log("✅ Image removed from Clerk successfully");

      // Also update database to remove image URL
      try {
        const response = await fetch("/api/sync-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar: null,
            avatarBase64: null,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth,
          }),
        });

        if (response.ok) {
          console.log("✅ Database updated to remove image URL");
        } else {
          console.warn("⚠️ Failed to update database to remove image URL");
        }
      } catch (dbError) {
        console.warn("⚠️ Failed to sync image removal to database:", dbError);
      }

      alert("Profile image removed successfully!");
    } catch (error) {
      console.error("❌ Error removing image:", error);
      if (error instanceof Error) {
        alert(`Failed to remove image: ${error.message}`);
      } else {
        alert("Failed to remove image: Unknown error");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Update form data when Clerk user loads
  useEffect(() => {
    if (clerkUser) {
      // Set Clerk data immediately
      const initialData = {
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
        email: getUserEmail(clerkUser) || "",
        phone: "",
        avatar: "",
        dateOfBirth: "",
        role: "USER",
      };

      setFormData(initialData);
      setOriginalFormData(initialData);

      // Fetch database-specific fields
      const fetchDatabaseFields = async () => {
        try {
          const response = await api.get("/api/sync-users");
          if (response.data) {
            const { user } = response.data;
            const updatedData = {
              ...initialData,
              phone: user.phone || "",
              role: user.role || "user",
              dateOfBirth: user.dateOfBirth
                ? new Date(user.dateOfBirth).toISOString().split("T")[0]
                : "",
            };
            setFormData(updatedData);
            setOriginalFormData(updatedData);

            // Set base64 image if available
            if (user.avatarBase64) {
              setBase64Image(user.avatarBase64);
            }
          }
        } catch (error) {
          console.error("Error fetching database fields:", error);
        }
      };

      fetchDatabaseFields();
    }
  }, [clerkUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateProfile = async () => {
    if (!clerkUser) return;

    setIsUpdating(true);
    try {
      let clerkUpdated = false;
      let databaseUpdated = false;

      // Debug: Log current user object structure
      console.log("🔍 Current Clerk user object:", {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        fullName: clerkUser.fullName,
        hasUpdate: typeof clerkUser.update === "function",
        userKeys: Object.keys(clerkUser),
      });

      // Check if Clerk fields changed and attempt to update them
      const clerkFieldsChanged =
        formData.firstName !== (clerkUser.firstName || "") ||
        formData.lastName !== (clerkUser.lastName || "");

      if (clerkFieldsChanged) {
        try {
          console.log("🔄 Updating Clerk fields...");
          console.log("📝 Attempting to update with:", {
            firstName: formData.firstName,
            lastName: formData.lastName,
          });

          // Use the exact same pattern as the documentation
          await clerkUser.update({
            firstName: formData.firstName || null,
            lastName: formData.lastName || null,
          });

          clerkUpdated = true;
          console.log("✅ Clerk fields updated successfully");
          console.log("📄 Updated user object:", {
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            fullName: clerkUser.fullName,
          });
        } catch (clerkError: unknown) {
          console.error("❌ Error updating Clerk fields:", clerkError);
          
          // Type-safe error handling
          if (clerkError instanceof Error) {
            console.error("🔍 Error details:", {
              message: clerkError.message,
              name: clerkError.name,
              stack: clerkError.stack,
            });
  
            // Check if it's a permissions issue
            if (clerkError.message?.includes("not a valid parameter")) {
              console.warn(
                "⚠️ firstName/lastName not allowed - possibly restricted in Clerk settings"
              );
            }
          } else {
            console.error("🔍 Unknown error type:", clerkError);
          }
  
          throw new Error("Failed to update Clerk fields");
        }
      }

      // Update database fields
      try {
        console.log("🔄 Updating database fields...");

        const response = await fetch("/api/sync-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth,
            imageUrl: clerkUser.imageUrl,
            avatarBase64: base64Image, // Include base64 image
          }),
        });

        if (response.ok) {
          const result = await response.json();
          databaseUpdated = true;
          console.log("✅ Database fields updated successfully:", result);
        } else {
          const errorData = await response.json();
          console.error("❌ Database update failed:", errorData.error);
          throw new Error(`Database update failed: ${errorData.error}`);
        }
      } catch (dbError) {
        console.error("❌ Error updating database fields:", dbError);
        // Don't throw here if Clerk was updated successfully
        if (!clerkUpdated) {
          throw dbError;
        }
      }

      // Update original form data to reflect successful changes
      setOriginalFormData({ ...formData });

      // Show success message
      if (clerkUpdated && databaseUpdated) {
        console.log("✅ Both Clerk and database updated successfully");
        alert("Profile updated successfully!");
      } else if (clerkUpdated) {
        console.log("✅ Clerk updated successfully (database unchanged)");
        alert("Profile updated successfully!");
      } else if (databaseUpdated) {
        console.log("✅ Database updated successfully (Clerk unchanged)");
        alert("Profile updated successfully!");
      } else {
        console.log("ℹ️ No changes were made");
        alert("No changes detected.");
      }
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      alert("An error occurred while updating your profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };



  const handleCancel = () => {
    setFormData({ ...originalFormData });
  };


  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-24 w-24 bg-gray-200 rounded-full mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-6">
        <Card className="border-gray-200">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">
              Please sign in to view your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getUserDisplayName(clerkUser);

  return (
    <div className="space-y-6">

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: "none" }}
      />

      {/* Account Information Card */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-start gap-2 mb-5">
            <UserIcon />
            <h1>Account Information</h1>
          </CardTitle>
          <CardDescription className="text-lg mb-5">
            Update your account information and manage your profile
          </CardDescription>
          {/* Profile Card */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                {isSignedIn ? (
                  <>
                    <div className="relative w-24 h-24">
                      <Avatar className="h-24 w-24 border border-gray-400 rounded-full">
                        <AvatarImage
                          src={
                            clerkUser.imageUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              displayName
                            )}&background=random`
                          }
                          alt={displayName}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              displayName
                            )}&background=random`;
                          }}
                        />
                        <AvatarFallback className="bg-purple-600">
                          {displayName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Edit Icon (bottom-right corner) */}
                      <div className="absolute bottom-0 right-0 flex gap-1">
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          disabled={isUploadingImage}
                          className="bg-orange-600 rounded-full p-2.5 shadow-md hover:bg-orange-500 disabled:bg-gray-400 cursor-pointer"
                          title="Change profile picture"
                        >
                          {isUploadingImage ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Pencil size={16} className="text-white" />
                          )}
                        </button>
                        {clerkUser.imageUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            disabled={isUploadingImage}
                            className="bg-red-600 rounded-full p-2.5 shadow-md hover:bg-red-500 disabled:bg-gray-400 cursor-pointer ml-1"
                            title="Remove profile picture"
                          >
                            <svg
                              width={16}
                              height={16}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              className="text-white"
                            >
                              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <h2 className="text-xl font-semibold">{displayName}</h2>
                      <p className="text-sm text-muted-foreground">
                        {getUserEmail(clerkUser)}
                      </p>
                      <div className="mt-2 flex justify-center">
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                        >
                          {formData.role === "USER"
                            ? "Customer"
                            : formData.role}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-full p-5 w-20 h-20 flex items-center justify-center mx-auto">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Upload a new profile picture
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Max file size: 2MB. Supported formats: JPG, PNG, WebP
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerFileInput}
                        disabled={isUploadingImage}
                        className="mt-2 bg-orange-600 text-white cursor-pointer hover:bg-orange-700"
                      >
                        {isUploadingImage ? "Uploading..." : "Select Image"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-8">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex gap-2">
                  <UserIcon size={15} /> <span>First Name</span>
                </Label>
                <Input
                  id="firstName"
                  className="md:h-14 border !text-[16px] border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex gap-2">
                  <UserIcon size={15} /> <span>Last Name</span>
                </Label>
                <Input
                  id="lastName"
                  className="md:h-14 border !text-[16px] border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex gap-2">
                  <Mail size={15} />
                  <span>Email Address</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="md:h-14 !text-[16px] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled // Email is managed by Clerk or auth provider
                />

                <span className="text-sm text-gray-500">
                  Email is managed by your authentication provider.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex gap-2">
                  <Shield size={15} /> <span>Phone Number</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  className="md:h-14 border !text-[16px] border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="flex gap-2">
                  <Shield size={15} /> <span>Role</span>
                </Label>
                <Input
                  id="role"
                  value={formData.role === "USER" ? "Customer" : formData.role}
                  className="md:h-14 border !text-[16px] border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-600"
                  disabled
                />
                <span className="text-sm text-gray-500">
                  Role is automatically determined.
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="flex gap-2">
                  <Cake size={15} />
                  <span>Date of Birth</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  className="md:h-14 border border-gray-300 !text-[16px] focus:outline-none focus:ring-2 focus:ring-orange-600"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    handleInputChange("dateOfBirth", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            className="cursor-pointer text-orange-600 hover:bg-orange-600 hover:text-white"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
            onClick={handleUpdateProfile}
            // disabled={isUpdating || isEmailUpdateMode}
          >
            {isUpdating ? "Updating..." : "Update Profile"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
