// src/app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { walletService } from "@/lib/wallet";
import { User } from "@prisma/client";
import { createUser, updateUser, deleteUser, getUser } from "@/lib/users";

// Add logging helper
function log<T>(
  message: string,
  data?: string | number | boolean | object | T
) {
  const timestamp = new Date().toISOString();
  console.log(
    `[WEBHOOK ${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

export async function POST(req: Request) {
  log("🚀 Webhook POST endpoint hit");

  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!webhookSecret) {
      log("❌ CLERK_WEBHOOK_SIGNING_SECRET is not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there is no svix header, throw an error
    if (!svix_id || !svix_timestamp || !svix_signature) {
      log("❌ Missing svix headers");
      return new Response("Missing required headers", { status: 400 });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new svix instance with the secret
    const svix = new Webhook(webhookSecret);

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
      evt = svix.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
      log("✅ Webhook signature verified successfully");
    } catch (error) {
      log("❌ Error verifying webhook signature:", error);
      return new Response("Invalid signature", { status: 400 });
    }

    // If the payload is not verified, throw an error
    if (!evt.data) {
      log("❌ Invalid payload - no data");
      return new Response("Invalid payload", { status: 400 });
    }

    const eventType = evt.type;
    log(`🎯 Processing webhook event: ${eventType}`);

    try {
      if (eventType === "user.created") {
        log("👤 Handling user.created event");
        const {
          id,
          email_addresses,
          first_name,
          last_name,
          image_url,
          phone_numbers,
        } = evt.data;

        if (!id) {
          log("❌ Invalid user data for creation: missing id");
          return new Response("Invalid user data", { status: 400 });
        }

        // Handle missing email
        let email = "";
        if (email_addresses && email_addresses.length > 0) {
          email = email_addresses[0].email_address;
        } else {
          log("⚠️ No email addresses found, using placeholder");
          email = `${id}@placeholder.com`;
        }

        const userData = {
          clerkId: id,
          email: email,
          ...(first_name ? { firstName: first_name } : {}),
          ...(last_name ? { lastName: last_name } : {}),
          ...(image_url ? { avatar: image_url } : {}),
          ...(phone_numbers && phone_numbers.length > 0
            ? { phone: phone_numbers[0].phone_number }
            : {}),
        };

        log("🏗️ Creating user with data:", userData);
        const newUser = await createUser(userData as User);
        log("✅ User created successfully:", newUser);

        // Create wallet for the new user - FIXED: pass both userId and clerkId
        try {
          log("💰 Creating wallet for new user:", newUser.id);
          const wallet = await walletService.createWallet(newUser.id, id); // Pass clerkId as second parameter
          log("✅ Wallet created successfully:", wallet);
        } catch (walletError) {
          log("❌ Error creating wallet:", walletError);
          // Continue even if wallet creation fails
        }

        return new Response("User created successfully", { status: 200 });
      } else if (eventType === "user.updated") {
        log("✏️ Handling user.updated event");
        const {
          id,
          email_addresses,
          first_name,
          last_name,
          image_url,
          phone_numbers,
        } = evt.data;

        if (!id) {
          log("❌ Invalid user data for update: missing id");
          return new Response("Invalid user data", { status: 400 });
        }

        log("🔍 Looking up existing user with clerkId:", id);
        const { user: existingUser } = await getUser("", id);
        if (!existingUser) {
          log("❌ User not found for update:", id);
          return new Response("User not found", { status: 404 });
        }

        const updateData: Partial<User> = {
          ...(email_addresses && email_addresses.length > 0
            ? { email: email_addresses[0].email_address }
            : {}),
          ...(first_name !== undefined ? { firstName: first_name } : {}),
          ...(last_name !== undefined ? { lastName: last_name } : {}),
          ...(image_url !== undefined ? { avatar: image_url } : {}),
          ...(phone_numbers && phone_numbers.length > 0
            ? { phone: phone_numbers[0].phone_number }
            : {}),
        };

        log("🔄 Updating user with data:", updateData);
        const updatedUser = await updateUser(existingUser.id, updateData);
        log("✅ User updated successfully:", updatedUser);

        // Ensure the user has a wallet (create if doesn't exist)
        try {
          log("💰 Getting or creating wallet for user:", updatedUser?.user?.id);
          // Only proceed if we have a valid user ID
          const userId = updatedUser?.user?.id;
          if (userId) {
            const wallet = await walletService.getOrCreateWallet(userId, id);
            log("✅ Wallet ensured for user:", wallet);
          }
          // log("✅ Wallet ensured for user:", wallet);
        } catch (walletError) {
          log("❌ Error getting/creating wallet:", walletError);
        }

        return new Response("User updated successfully", { status: 200 });
      } else if (eventType === "user.deleted") {
        log("🗑️ Handling user.deleted event");
        const { id } = evt.data;

        if (!id) {
          log("❌ Invalid user data for deletion: missing id");
          return new Response("Invalid user data", { status: 400 });
        }

        log("🔍 Looking up existing user with clerkId for deletion:", id);
        const { user: existingUser } = await getUser("", id);
        if (!existingUser) {
          log("❌ User not found for deletion:", id);
          return new Response("User not found", { status: 404 });
        }

        log("🗑️ Deleting user:", existingUser);
        const deletedUser = await deleteUser(existingUser.id);
        log("✅ User deleted successfully:", deletedUser);

        return new Response("User deleted successfully", { status: 200 });
      } else {
        log(`⚠️ Unhandled webhook event type: ${eventType}`);
        return new Response("Event type not handled", { status: 200 });
      }
    } catch (dbError) {
      log("❌ Database operation error:", dbError);
      return new Response("Database operation failed", { status: 500 });
    }
  } catch (err) {
    log("❌ Webhook processing error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}

// GET method for testing
export async function GET() {
  log("🔍 GET request to webhook endpoint - route is accessible");
  return new Response("Webhook endpoint is accessible", { status: 200 });
}
