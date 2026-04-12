import { z } from "zod";

/**
 * Student Registration Schema
 * POST /api/auth/student/register
 */
export const registerStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  batch_id: z.number().int().positive("Batch ID is required"),
  enrollment_id: z.string().optional(),
  leetcode_id: z.string().optional(),
  gfg_id: z.string().optional(),
});

/**
 * Student Login Schema
 * POST /api/auth/student/login
 * Requires either email or username
 */
export const loginStudentSchema = z
  .object({
    email: z.string().email("Invalid email format").optional(),
    username: z.string().min(3, "Username must be at least 3 characters").optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine((data) => data.email || data.username, {
    message: "Either email or username is required",
    path: ["email"],
  });

/**
 * Admin Login Schema
 * POST /api/auth/admin/login
 */
export const loginAdminSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Forgot Password Schema
 * POST /api/auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

/**
 * Verify OTP Schema
 * POST /api/auth/verify-otp
 */
export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

/**
 * Reset Password Schema
 * POST /api/auth/reset-password
 */
export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().min(1, "OTP is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Admin Registration Schema
 * POST /api/auth/admin/register (via superadmin)
 */
export const registerAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["SUPERADMIN", "TEACHER", "INTERN"]).optional(),
  city_id: z.number().int().positive().optional(),
  batch_id: z.number().int().positive().optional(),
});

// Type exports
type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
type LoginStudentInput = z.infer<typeof loginStudentSchema>;
type LoginAdminInput = z.infer<typeof loginAdminSchema>;
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
