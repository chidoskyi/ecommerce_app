interface ApiError {
    response?: {
      status?: number
      data?: {
        error?: string
        message?: string
      }
    }
    message?: string
  }
  
  export const handleApiError = (error: unknown): string => {
    console.error("API Error:", error)
  
    const err = error as ApiError // Type assertion
  
    // Handle 401 Unauthorized
    if (err.response?.status === 401) {
      return "Authentication failed. Please sign in again."
    }
  
    // Handle 403 Forbidden
    if (err.response?.status === 403) {
      return "You don't have permission to perform this action."
    }
  
    // Handle custom error messages from API
    if (err.response?.data?.error) {
      return err.response.data.error
    }
  
    // Handle generic Error objects
    if (error instanceof Error) {
      return error.message
    }
  
    // Fallback for unknown errors
    return "An unexpected error occurred"
  }