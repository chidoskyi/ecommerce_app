import { StorageUtil } from '@/lib/storageKeys';
import { setAuthenticated } from "@/app/store/slices/cartSlice";
import { Dispatch } from 'redux'; // Add proper dispatch type

export interface UserIdentificationResult {
  userId: string | null;
  guestId: string | null;
}

export interface UserIdentificationParams {
  storageUserId: string | null;
  storageGuestId: string | null;
  reduxUserId: string | null;
  reduxGuestId: string | null;
  clerkUserId: string | undefined;
  isSignedIn: boolean | undefined; // Allow undefined
  dispatch: Dispatch; // Use proper Redux dispatch type
}


export const ensureUserIdentification = ({
  storageUserId,
  storageGuestId,
  reduxUserId,
  reduxGuestId,
  clerkUserId,
  isSignedIn,
  dispatch
}: UserIdentificationParams): UserIdentificationResult => {
  
  console.log("🔍 User identification check:", {
    storageUserId,
    storageGuestId,
    reduxUserId,
    reduxGuestId,
    clerkUserId,
    isSignedIn
  });

  // Priority order: Clerk user > Storage > Redux
  let finalUserId: string | null = null;
  let finalGuestId: string | null = null;

  // Handle the case where isSignedIn might be undefined
  const signedIn = isSignedIn === true; // Explicitly check for true

  if (signedIn && clerkUserId) {
    // User is authenticated
    finalUserId = clerkUserId;
    finalGuestId = null;
    
    // Ensure storage is in sync
    if (storageUserId !== clerkUserId) {
      console.log("🔧 Syncing storage with authenticated user");
      StorageUtil.setUserMode(clerkUserId);
    }
    
    // Ensure Redux is in sync
    if (reduxUserId !== clerkUserId) {
      console.log("🔧 Syncing Redux with authenticated user");
      dispatch(setAuthenticated({
        isAuthenticated: true,
        userId: clerkUserId,
      }));
    }
  } else {
    // User is not authenticated - use guest mode
    finalUserId = null;
    finalGuestId = storageGuestId || reduxGuestId;
    
    // If no guest ID exists anywhere, create one
    if (!finalGuestId) {
      console.log("⚠️ Creating new guest ID for cart operation");
      finalGuestId = StorageUtil.generateAndSetGuestId();
      dispatch(setAuthenticated({
        isAuthenticated: false,
        userId: null,
      }));
    }
  }

  console.log("✅ Final user identification:", { 
    userId: finalUserId, 
    guestId: finalGuestId 
  });

  return { userId: finalUserId, guestId: finalGuestId };
};