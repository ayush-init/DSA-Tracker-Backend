/**
 * Authentication Controller - User authentication endpoints
 * Handles user registration, login, and authentication token management
 * Provides secure access control for the application
 */

import { Request, Response } from 'express';
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ExtendedRequest } from "../types";
import {
  loginStudent as loginStudentService,
  loginAdmin as loginAdminService,
  googleAuth as googleAuthService,
  refreshAccessToken as refreshAccessTokenService
} from '../services/auth/auth-login.service';
import {
  logoutStudent as logoutStudentService,
  logoutAdmin as logoutAdminService
} from '../services/auth/auth-logout.service';
import {
  sendPasswordResetOTP as sendPasswordResetOTPService,
  verifyOTP as verifyOTPService,
  resetPassword as resetPasswordService
} from '../services/auth/auth-password.service';
import {
  registerStudent as registerStudentService,
  registerAdmin as registerAdminService
} from '../services/auth/auth-register.service';

// Student Registration

export const registerStudent = asyncHandler(async (req: Request, res: Response) => {

  const student = await registerStudentService(req.body);



  res.status(201).json({

    message: 'Student registered successfully',

    user: student,

  });

});



// Student Login

export const loginStudent = asyncHandler(async (req: Request, res: Response) => {

  const { user, accessToken, refreshToken } = await loginStudentService(req.body);

  

  // Set refresh token cookie

  res.cookie('refreshToken', refreshToken, {

    httpOnly: true,

    secure: process.env.NODE_ENV === 'production',

    sameSite: 'lax',

    maxAge: 7 * 24 * 60 * 60 * 1000,

    path: '/'

  });

 

  res.json({

    message: 'Login successful',

    accessToken,

    user,

  });

});



// Admin/Teacher Registration

export const registerAdmin = asyncHandler(async (req: Request, res: Response) => {

  const { user, accessToken, refreshToken } = await registerAdminService({

    ...req.body,

    currentUserRole: req.user?.role

  });

 

  res.status(201).json({

    message: 'Admin registered successfully',

    accessToken,

    user,

  });

});



// Admin Login

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {

  const { user, accessToken, refreshToken } = await loginAdminService(req.body);

  

  // Set refresh token cookie

  res.cookie('refreshToken', refreshToken, {

    httpOnly: true,

    secure: process.env.NODE_ENV === 'production',

    sameSite: 'lax',

    maxAge: 7 * 24 * 60 * 60 * 1000,

    path: '/'

  });



  res.json({

    message: 'Login successful',

    accessToken,

    user,

  });

});



export const refreshToken = asyncHandler(async (req: Request, res: Response) => {

  const refreshToken = req.cookies.refreshToken;

  const { accessToken } = await refreshAccessTokenService(refreshToken);

  

  res.json({ accessToken });

});



export const googleLogin = asyncHandler(async (req: Request, res: Response) => {

  const { idToken } = req.body;

  const { user, accessToken, refreshToken } = await googleAuthService(idToken);

  

  // Set refresh token cookie

  res.cookie('refreshToken', refreshToken, {

    httpOnly: true,

    secure: process.env.NODE_ENV === 'production',

    sameSite: 'lax',

    maxAge: 7 * 24 * 60 * 60 * 1000,

    path: '/'

  });



  res.json({

    message: "Google login successful",

    accessToken,

    user,

  });

});



// Student Logout

export const logoutStudent = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const student = req.student;
  if (!student) {
    throw new ApiError(401, "Authentication required - student information missing");
  }

  await logoutStudentService(student.id);

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({
    message: "Student logout successful",
  });
});



// Admin Logout

export const logoutAdmin = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const admin = req.admin;
  if (!admin) {
    throw new ApiError(401, "Authentication required - admin information missing");
  }

  await logoutAdminService(admin.id);

  

  // Clear refresh token cookie

  res.clearCookie('refreshToken');



  res.json({

    message: "Admin logout successful",

  });

});



// Forgot Password - Send OTP

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {

  const { email } = req.body;

  const result = await sendPasswordResetOTPService(email);

  

  res.json(result);

});



// Verify OTP - Only validate OTP, don't reset password

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {

  const { email, otp } = req.body;

  const result = await verifyOTPService(email, otp);

  

  res.json(result);

});



// Reset Password - Verify OTP and reset password

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {

  const { email, otp, newPassword } = req.body;

  const result = await resetPasswordService(email, otp, newPassword);

  

  res.json(result);

});

