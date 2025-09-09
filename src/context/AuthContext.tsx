"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/nextjs";

export interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  retryCount: number;
  userId: string | null; // Added clerkId to context
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'auth_token';
const USER_ID_STORAGE_KEY = 'user_id'; // New storage key for clerkId

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken: clerkGetToken } = useClerkAuth();
  
  const [token, setToken] = useState<string | null>(() => {
    // Initialize token from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    }
    return null;
  });

  // Initialize userId from localStorage
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(USER_ID_STORAGE_KEY);
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const tokenFetchInProgress = useRef(false);

  // Helper function to store token in localStorage
  const storeToken = useCallback((newToken: string | null) => {
    if (typeof window !== 'undefined') {
      if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    setToken(newToken);
  }, []);

  // Helper function to store userId in localStorage
  const storeUserId = useCallback((newUserId: string | null) => {
    if (typeof window !== 'undefined') {
      if (newUserId) {
        localStorage.setItem(USER_ID_STORAGE_KEY, newUserId);
      } else {
        localStorage.removeItem(USER_ID_STORAGE_KEY);
      }
    }
    setUserId(newUserId);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (tokenFetchInProgress.current) {
      return token;
    }

    try {
      tokenFetchInProgress.current = true;
      setError(null);

      if (!user || !isLoaded) {
        storeToken(null);
        storeUserId(null); // Clear userId when no user
        return null;
      }

      // Store clerkId when user is available
      if (user.id && user.id !== userId) {
        storeUserId(user.id);
      }

      let newToken: string | null = null;
      
      try {
        newToken = await clerkGetToken({ template: "_apptoken" });
      } catch (clerkError) {
        console.warn("⚠️ Clerk hook failed, trying window.Clerk:", clerkError);
        // Use proper typing for Clerk object
        const clerk = (window as typeof window & { Clerk?: { session?: { getToken: (options: { template: string }) => Promise<string> } } }).Clerk;
        if (clerk?.session) {
          newToken = await clerk.session.getToken({ template: "_apptoken" });
        }
      }

      if (!newToken) {
        console.warn("❌ Token generation failed");
        storeToken(null);
        // Don't clear userId here, user might still be logged in but token failed
        setRetryCount(prev => prev + 1);
        return null;
      }

      storeToken(newToken);
      setRetryCount(0);
      
      return newToken;

    } catch (err) {
      console.error("❌ Error getting token:", err);
      storeToken(null);
      setError(err instanceof Error ? err.message : "Failed to get token");
      setRetryCount(prev => prev + 1);
      return null;
    } finally {
      tokenFetchInProgress.current = false;
    }
  }, [user, isLoaded, clerkGetToken, token, userId, storeToken, storeUserId]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      const newToken = await getToken();
      return newToken;
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear stored data before signOut
      storeToken(null);
      storeUserId(null);
      setRetryCount(0);
      
      await signOut();
      
    } catch (err) {
      console.error("Logout failed:", err);
      setError(err instanceof Error ? err.message : "Failed to logout");
    } finally {
      setIsLoading(false);
    }
  }, [signOut, storeToken, storeUserId]);

  // Effect to handle user state changes (login/logout)
  useEffect(() => {
    if (isLoaded) {
      if (user?.id) {
        // User is logged in
        storeUserId(user.id);
        
        // Get token for authenticated user
        setIsLoading(true);
        getToken().finally(() => {
          setIsLoading(false);
        });
      } else {
        storeToken(null);
        storeUserId(null);
        setIsLoading(false);
      }
    }
  }, [isLoaded, user?.id, getToken, storeToken, storeUserId]);

  // Sync clerkId with localStorage if it changes
  useEffect(() => {
    if (user?.id && user.id !== userId) {
      storeUserId(user.id);
    }
  }, [user?.id, userId, storeUserId]);

  useEffect(() => {
    if (!user || !token) return;

    const interval = setInterval(async () => {
      try {
        await getToken();
      } catch (err) {
        console.error("❌ Scheduled token refresh failed:", err);
      }
    }, 4 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [user, token, getToken]);

  useEffect(() => {
    if (retryCount > 0 && retryCount < 3 && user && isLoaded && !token) {
      console.log(`🔄 Retrying token fetch (attempt ${retryCount + 1}/3)`);
      const timeout = setTimeout(() => {
        getToken();
      }, 1000 * retryCount);
      return () => clearTimeout(timeout);
    }
  }, [retryCount, user, isLoaded, token, getToken]);

  const contextValue: AuthContextType = {
    token,
    isLoading: isLoading || !isLoaded,
    error,
    refreshToken,
    logout,
    isAuthenticated: !!user && !!token && isLoaded,
    retryCount,
    userId, // Added userId to context value
  };

  // useEffect(() => {
  //   console.log("🔍 Auth state:", {
  //     hasUser: !!user,
  //     hasToken: !!token,
  //     hasUserId: !!userId,
  //     userId: userId,
  //     isLoaded,
  //     isAuthenticated: contextValue.isAuthenticated,
  //     retryCount,
  //   });
  // }, [user, token, userId, isLoaded, contextValue.isAuthenticated, retryCount]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};