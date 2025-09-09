// lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
})

// Enhanced token getter with debugging
interface ClerkSession {
  getToken: (options: { template: string }) => Promise<string>;
}

interface ClerkUser {
  id?: string;
}

interface ClerkObject {
  session?: ClerkSession;
  user?: ClerkUser;
}

interface ClerkWindow extends Window {
  Clerk?: ClerkObject;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    if (typeof window === 'undefined') {
      console.warn('getAuthHeaders called on server-side');
      return {};
    }
    
    const clerk = (window as ClerkWindow).Clerk;
    if (!clerk?.session) {
      console.warn('Clerk session not available');
      return {};
    }

    const [token, userId] = await Promise.all([
      clerk.session.getToken({ template: '_apptoken' }),
      clerk.user?.id
    ]);

    if (!token) {
      console.warn('Token generation returned null/undefined');
      return {};
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'x-auth-token': token
    };
    
    if (userId) {
      headers['x-user-id'] = userId;
    }
    
    return headers;
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {};
  }
};

// Request interceptor with FormData support
api.interceptors.request.use(
  async (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    
    // Handle FormData requests - don't set Content-Type
    if (config.data instanceof FormData) {
      console.log('📁 Detected FormData - letting browser handle Content-Type')
      // Remove any existing Content-Type header for FormData
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    } else if (config.data && typeof config.data === 'object' && !config.headers['Content-Type']) {
      // For JSON objects, set Content-Type if not already set
      config.headers['Content-Type'] = 'application/json';
    }

    // Skip auth headers if already set
    if (config.headers.Authorization) {
      console.log('ℹ️ Authorization header already exists')
      return config
    }

    const authHeaders = await getAuthHeaders()
    if (authHeaders.Authorization) {
      console.log('➕ Adding auth headers to request')
      config.headers = { ...config.headers, ...authHeaders }
    } else {
      console.warn('⚠️ No auth headers available')
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    console.error(`❌ API Error: ${error.response?.status} ${originalRequest?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
    })
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔄 Attempting token refresh for 401 error')
      originalRequest._retry = true
      
      const authHeaders = await getAuthHeaders()
      if (authHeaders.Authorization) {
        console.log('✅ Got new token, retrying request')
        originalRequest.headers = { 
          ...originalRequest.headers,
          ...authHeaders
        }
        return api(originalRequest)
      }
      
      console.log('❌ Token refresh failed, redirecting to login')
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in?redirect=' + encodeURIComponent(window.location.pathname)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api