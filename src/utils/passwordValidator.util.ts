/**
 * Password Validation Utility
 * 
 * Provides centralized password validation with regex-based rules
 * for consistent security across all user types (Student, Admin, SuperAdmin)
 */

import { PasswordValidationResult, PasswordRule } from "../types/utility.types";

/**
 * Password validation rules with regex patterns
 */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    regex: /.{8,}/,
    message: 'Password must be at least 8 characters long',
    description: 'At least 8 characters'
  },
  {
    regex: /[A-Z]/,
    message: 'Password must contain at least one uppercase letter',
    description: 'One uppercase letter'
  },
  {
    regex: /[a-z]/,
    message: 'Password must contain at least one lowercase letter',
    description: 'One lowercase letter'
  },
  {
    regex: /\d/,
    message: 'Password must contain at least one number',
    description: 'One number'
  },
  {
    regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    message: 'Password must contain at least one special character',
    description: 'One special character'
  }
];

/**
 * Validates password against all security rules
 * @param password - Password string to validate
 * @returns PasswordValidationResult with validation details
 */
export function validatePassword(password: string): PasswordValidationResult {
  // Check for empty password
  if (!password) {
    return {
      isValid: false,
      message: 'Password is required',
      strength: 'weak',
      missingRequirements: ['Password is required']
    };
  }

  const missingRequirements: string[] = [];
  const passedRules: string[] = [];

  // Check each rule
  PASSWORD_RULES.forEach(rule => {
    if (!rule.regex.test(password)) {
      missingRequirements.push(rule.description);
    } else {
      passedRules.push(rule.description);
    }
  });

  const isValid = missingRequirements.length === 0;
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let message: string;

  if (isValid) {
    // Calculate strength based on additional factors
    const length = password.length;
    const hasComplexSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasMultipleSpecialChars = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length >= 2;
    const hasNumbers = (password.match(/\d/g) || []).length >= 2;
    const hasMultipleUppercase = (password.match(/[A-Z]/g) || []).length >= 2;
    const hasMultipleLowercase = (password.match(/[a-z]/g) || []).length >= 2;
    
    if (length >= 12 && (hasMultipleSpecialChars || hasMultipleUppercase || hasMultipleLowercase) && hasNumbers) {
      strength = 'strong';
      message = 'Password is strong and meets all security requirements';
    } else if (length >= 8 && hasComplexSpecialChars) {
      strength = 'medium';
      message = 'Password is good and meets all security requirements';
    } else {
      strength = 'weak';
      message = 'Password meets minimum requirements but could be stronger';
    }
  } else {
    // Build error message based on missing requirements
    if (missingRequirements.length === 1) {
      message = `Missing: ${missingRequirements[0]}`;
    } else if (missingRequirements.length <= 3) {
      message = `Missing: ${missingRequirements.join(', ')}`;
    } else {
      message = 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character';
    }
  }

  return {
    isValid,
    message,
    strength,
    missingRequirements
  };
}

/**
 * Custom validation error interface
 */
interface ValidationError extends Error {
  statusCode?: number;
  code?: string;
  type?: string;
}

/**
 * Middleware-friendly validation function that throws ApiError
 * Use this in controllers for consistent error handling
 */
export function validatePasswordForAuth(password: string): void {
  const validation = validatePassword(password);
  
  if (!validation.isValid) {
    const error = new Error(validation.message) as ValidationError;
    error.statusCode = 400;
    error.code = 'INVALID_PASSWORD';
    error.type = 'VALIDATION_ERROR';
    throw error;
  }
}

