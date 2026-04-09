/**
 * Authentication Types - JWT tokens and authentication interfaces
 * Types for JWT payloads, authentication requests, and user sessions
 */

import { AdminRole } from "@prisma/client";

// JWT Token Payloads
export interface AccessTokenPayload {
  id: number;
  email: string;
  role: "STUDENT" | AdminRole;
  userType: "student" | "admin";
  batchId?: number;      // Added for students
  batchName?: string;    // Added for students
  batchSlug?: string;    // Added for students (useful for URLs)
  cityId?: number;       // Added for students
  cityName?: string;     // Added for students
}

export interface RefreshTokenPayload {
  id: number;
  userType: "student" | "admin";
}

// Authentication Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: AdminRole;
}

export interface PasswordResetRequest {
  email: string;
}

export interface OTPVerificationRequest {
  email: string;
  otp: string;
}

export interface PasswordUpdateRequest {
  newPassword: string;
}

// Authentication Response Types
export interface LoginResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    userType: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    name: string;
  };
}
