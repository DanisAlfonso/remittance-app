import type { ValidationError } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!password.trim()) {
    errors.push({ field: 'password', message: 'Password is required' });
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  }
  
  if (!/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one special character' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateName(name: string, fieldName: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!name.trim()) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  } else if (name.trim().length < 2) {
    errors.push({ field: fieldName, message: `${fieldName} must be at least 2 characters` });
  } else if (name.trim().length > 50) {
    errors.push({ field: fieldName, message: `${fieldName} must be less than 50 characters` });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePhone(phone: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function sanitizeInput(input: string): string {
  // Basic input sanitization for security
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, ''); // Remove < and > characters
}