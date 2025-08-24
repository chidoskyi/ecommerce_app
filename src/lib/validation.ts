import Joi from 'joi'

// Auth validation schemas
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
})

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters'
  }),
  phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).optional().messages({
    'string.pattern.base': 'Please enter a valid phone number'
  })
})

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters'
  }),
  phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).optional().allow('').messages({
    'string.pattern.base': 'Please enter a valid phone number'
  }),
  avatar: Joi.string().uri().optional().allow('').messages({
    'string.uri': 'Avatar must be a valid URL'
  })
})

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'any.required': 'New password is required'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Password confirmation is required'
  })
})

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  })
})

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Password confirmation is required'
  })
})

// lib/validation.ts
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}