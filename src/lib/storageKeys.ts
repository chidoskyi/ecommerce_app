// lib/storageKeys.ts
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_ID: "user_id",
  GUEST_ID_KEY: "guest-cart-id",
  CART_DATA_KEY: "guest-cart-data",
} as const;

// Helper to check if we're on client side safely
const isClientSide = () => typeof window !== "undefined";

export const StorageUtil = {
  // User ID management
  setUserId: function(userId: string): void {
    if (!isClientSide()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      console.log("🆔 User ID stored:", userId);
    } catch (error) {
      console.warn("Failed to store user ID:", error);
    }
  },

  getUserId: function(): string | null {
    if (!isClientSide()) return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_ID);
    } catch (error) {
      console.warn("Failed to get user ID:", error);
      return null;
    }
  },

  clearUserId: function(): void {
    if (!isClientSide()) return;
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_ID);
      console.log("🗑️ User ID cleared");
    } catch (error) {
      console.warn("Failed to clear user ID:", error);
    }
  },

  // Guest ID management - FIXED to not auto-clear during login
  setGuestId: function(guestId: string): void {
    if (!isClientSide()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.GUEST_ID_KEY, guestId);
      console.log("🆔 Guest ID stored:", guestId);
    } catch (error) {
      console.warn("Failed to store guest ID:", error);
    }
  },

  getGuestId: function(): string | null {
    if (!isClientSide()) return null;
    
    try {
      // CHANGED: Always return guest ID if it exists, regardless of user status
      // This allows for cart merging during login flow
      let guestId = localStorage.getItem(STORAGE_KEYS.GUEST_ID_KEY);
      
      // Only generate new guest ID if none exists AND no user is logged in
      if (!guestId && !this.getUserId()) {
        guestId = this.generateAndSetGuestId();
      }
      
      return guestId;
    } catch (error) {
      console.warn("Failed to get guest ID:", error);
      return null;
    }
  },

  // FIXED: New method to get guest ID even when user is logged in
  getGuestIdForMerge: function(): string | null {
    if (!isClientSide()) return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.GUEST_ID_KEY);
    } catch (error) {
      console.warn("Failed to get guest ID for merge:", error);
      return null;
    }
  },

  generateAndSetGuestId: function(): string {
    if (!isClientSide()) return "";
    
    try {
      // Use crypto.randomUUID if available for better randomness
      const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).substr(2, 9);
        
      const guestId = `guest_${Date.now()}_${randomPart}`;
      this.setGuestId(guestId);
      return guestId;
    } catch (error) {
      console.warn("Failed to generate guest ID:", error);
      return "";
    }
  },

  clearGuestId: function(): void {
    if (!isClientSide()) return;
    try {
      localStorage.removeItem(STORAGE_KEYS.GUEST_ID_KEY);
      console.log("🗑️ Guest ID cleared");
    } catch (error) {
      console.warn("Failed to clear guest ID:", error);
    }
  },

  // FIXED: State transitions - don't clear guest ID immediately
  setUserMode: function(userId: string): void {
    this.setUserId(userId);
    console.log("🔄 Set user mode (preserving guest ID for merge):", userId);
  },

  switchToUserMode: function(userId: string): void {
    this.setUserId(userId);
    this.clearGuestId();
    console.log("🔄 Switched to user mode:", userId);
  },

  switchToGuestMode: function(): string {
    this.clearUserId();
    const guestId = this.generateAndSetGuestId();
    console.log("🔄 Switched to guest mode:", guestId);
    return guestId;
  },

  // Cart utilities
  generateCartItemId: function(): string {
    const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substr(2, 9);
    return `cart_${Date.now()}_${randomPart}`;
  },

  clearCartData: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.CART_DATA_KEY);
  },

  // Debugging
  debugStorage: function(): void {
    if (!isClientSide()) {
      console.log("🔍 Storage Debug: Not on client side");
      return;
    }
    
    try {
      console.log("🔍 Storage Debug:", {
        userId: this.getUserId(),
        guestId: this.getGuestId(),
        guestIdForMerge: this.getGuestIdForMerge(),
        cartData: !!localStorage.getItem(STORAGE_KEYS.CART_DATA_KEY),
        otherGuestIds: Object.keys(localStorage).filter(key => 
          key.includes('guest') && key !== STORAGE_KEYS.GUEST_ID_KEY
        )
      });
    } catch (error) {
      console.warn("Failed to debug storage:", error);
    }
  },
  
  // Migration helper
  migrateOldKeys: function(): void {
    if (!isClientSide()) return;
    
    try {
      const oldGuestKeys = ["guestId", "guest_id", "guest-id"];
      const currentGuestId = this.getGuestIdForMerge();
      
      for (const oldKey of oldGuestKeys) {
        const value = localStorage.getItem(oldKey);
        if (value && value !== currentGuestId) {
          console.log(`🔄 Migrating ${oldKey} to guest-cart-id`);
          this.setGuestId(value);
          localStorage.removeItem(oldKey);
        }
      }
    } catch (error) {
      console.warn("Failed to migrate old keys:", error);
    }
  }
};