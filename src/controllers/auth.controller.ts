import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { OAuth2Client } from 'google-auth-library';
import { generateOTP, saveOTP, validateOTP } from '../utils/otp.util';
import { sendOTPEmail } from '../utils/email.util';
import { validateEmail } from '../utils/emailValidation.util';
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Student Registration
export const registerStudent = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    username,
    password,
    enrollment_id,
    batch_id,
    leetcode_id,
    gfg_id
  } = req.body;

  // Validation
  if (!name || !email || !username || !password || !batch_id) {
    throw new ApiError(400, 'Name, email, username, password, and batch_id are required', [], "REQUIRED_FIELD");
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new ApiError(400, emailValidation.error, [], "INVALID_EMAIL");
  }

  // Check existing user
  const existingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email }, { username }, { enrollment_id }],
    },
  });

  if (existingStudent) {
    throw new ApiError(400, 'Email, username, or enrollment_id already exists', [], "USER_EXISTS");
  }

  // Get batch information to fetch city_id
  const batch = await prisma.batch.findUnique({
    where: { id: batch_id },
    include: { city: true }
  });

  if (!batch) {
    throw new ApiError(400, 'Invalid batch_id', [], "BATCH_NOT_FOUND");
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create student
  const student = await prisma.student.create({
    data: {
      name,
      email,
      username,
      password_hash,
      enrollment_id,
      batch_id,
      city_id: batch.city.id,  // Fetch city_id from batch
      leetcode_id,
      gfg_id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      enrollment_id: true,
      batch_id: true,
      city_id: true,
      leetcode_id: true,
      gfg_id: true,
      created_at: true,
      batch: {
        select: {
          id: true,
          batch_name: true,
          slug: true,
          year: true
        }
      },
      city: {
        select: {
          id: true,
          city_name: true
        }
      }
    },
  });

  res.status(201).json({
    message: 'Student registered successfully',
    user: student,
  });
});

// Student Login
export const loginStudent = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, username } = req.body;

  if ((!email && !username) || !password) {
    throw new ApiError(400, 'Either email or username with password are required');
  }

  // Validate email domain if email is provided
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw new ApiError(400, emailValidation.error);
    }
  }

  // Find student by email or username
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        email ? { email } : {},
        username ? { username } : {}
      ]
    },
    include: {
      city: true,
      batch: true,
    },
  });

  if (!student || !student.password_hash) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Compare password
  const isValidPassword = await comparePassword(password, student.password_hash);

  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const accessToken = generateAccessToken({
    id: student.id,
    email: student.email,
    role: 'STUDENT',
    userType: 'student',
    ...(student.batch && student.city && {
      batchId: student.batch.id,
      batchName: student.batch.batch_name,
      batchSlug: student.batch.slug,
      cityId: student.city.id,
      cityName: student.city.city_name,
    }),
  });

  const refreshToken = generateRefreshToken({
    id: student.id,
    userType: 'student',
  });

  await prisma.student.update({
    where: { id: student.id },
    data: { refresh_token: refreshToken },
  });

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  res.json({
    message: 'Login successful',
    accessToken,
    user: {
      id: student.id,
      name: student.name,
      email: student.email,
      username: student.username,
      city: student.city,
      batch: student.batch,
      leetcode_id: student.leetcode_id,
      gfg_id: student.gfg_id,
      cityId: student.city_id,
      cityName: student.city?.city_name || null,
      batchId: student.batch_id,
      batchName: student.batch?.batch_name || null,
      batchSlug: student.batch?.slug || null
    },
  });
});

// Admin/Teacher Registration
export const registerAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    throw new ApiError(400, 'All fields are required');
  }

  // Check existing admin
  const existingAdmin = await prisma.admin.findFirst({
    where: {
      email,
    },
  });

  if (existingAdmin) {
    throw new ApiError(400, 'Email already exists');
  }

  if (req.user?.role !== "SUPERADMIN") {
    throw new ApiError(403, "Only SuperAdmin can create admin");
  }

  if (role !== "TEACHER" && role !== "INTERN" && role !== "SUPERADMIN") {
    throw new ApiError(400, "Invalid role type");
  }
  const password_hash = await hashPassword(password);

  const admin = await prisma.admin.create({
    data: {
      name,
      email,
      password_hash,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  const accessToken = generateAccessToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    userType: 'admin',
  });

  const refreshToken = generateRefreshToken({
    id: admin.id,
    userType: 'admin',
  });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { refresh_token: refreshToken },
  });

  res.status(201).json({
    message: 'Admin registered successfully',
    accessToken,

    user: admin,
  });
});


// Admin Login
export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const admin = await prisma.admin.findUnique({
    where: { email },
    include: {
      batch: {
        select: {
          id: true,
          batch_name: true,
          city: {
            select: {
              id: true,
              city_name: true
            }
          }
        }
      }
    }
  });

  if (!admin || !admin.password_hash) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isValidPassword = await comparePassword(password, admin.password_hash);

  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const accessToken = generateAccessToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    userType: 'admin',
    ...(admin.batch && admin.batch.city && {
      batchId: admin.batch.id,
      batchName: admin.batch.batch_name,
      cityId: admin.batch.city.id,
      cityName: admin.batch.city.city_name,
    }),
  });

  const refreshToken = generateRefreshToken({
    id: admin.id,
    userType: 'admin',
  });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { refresh_token: refreshToken },
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  res.json({
    message: 'Login successful',
    accessToken,

    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

// Adding  Referesh Token API


export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Get refresh token from HTTP-only cookie
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token required');
  }

  const decoded = verifyRefreshToken(refreshToken);

  let user: any;

  if (decoded.userType === 'admin') {
    user = await prisma.admin.findUnique({
      where: { id: decoded.id },
      include: {
        batch: {
          select: { id: true, batch_name: true, city: { select: { id: true, city_name: true } } }
        }
      }
    });
  } else {
    user = await prisma.student.findUnique({
      where: { id: decoded.id },
      include: {
        batch: true,
        city: true
      }
    });
  }

  if (!user || user.refresh_token !== refreshToken) {
    throw new ApiError(403, 'Invalid refresh token');
  }

  const newAccessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: decoded.userType === 'admin' ? user.role : 'STUDENT',
    userType: decoded.userType,
    ...(user.batch && decoded.userType === 'admin' && user.batch.city && {
      batchId: user.batch.id,
      batchName: user.batch.batch_name,
      cityId: user.batch.city.id,
      cityName: user.batch.city.city_name,
    }),
    ...(user.batch && decoded.userType === 'student' && user.city && {
      batchId: user.batch.id,
      batchName: user.batch.batch_name,
      batchSlug: user.batch.slug,
      cityId: user.city.id,
      cityName: user.city.city_name,
    }),
  });

  res.json({ accessToken: newAccessToken });
});


export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, "ID token required");
  }

  // Verify token with Google using official google-auth-library
  async function verifyIdToken(idToken: string) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      return payload;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      console.error("Google Auth Library verifyIdToken Error:", error.message);
      throw new ApiError(400, 'Failed to verify Google token: ' + error.message);
    }
  }

  const payload = await verifyIdToken(idToken);

  if (!payload?.email) {
    throw new ApiError(400, "Invalid Google token");
  }

  const email = payload.email;
  const googleId = payload.sub;

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new ApiError(400, emailValidation.error);
  }

  // Check if student exists
  const student = await prisma.student.findUnique({
    where: { email },
    include: {
      city: true,
      batch: true,
    },
  });

  if (!student) {
    throw new ApiError(403, "Student not registered by admin");
  }

  // Update google_id if not set
  if (!student.google_id) {
    await prisma.student.update({
      where: { id: student.id },
      data: { google_id: googleId },
    });
  }

  const accessToken = generateAccessToken({
    id: student.id,
    email: student.email,
    role: "STUDENT",
    userType: "student",
    // Include batch and city info if available
    ...(student.batch && student.city && {
      batchId: student.batch.id,
      batchName: student.batch.batch_name,
      batchSlug: student.batch.slug,
      cityId: student.city.id,
      cityName: student.city.city_name,
    }),
  });

  const refreshToken = generateRefreshToken({
    id: student.id,
    userType: "student",
  });

  await prisma.student.update({
    where: { id: student.id },
    data: { refresh_token: refreshToken },
  });
 
  // For Google Auth
  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  res.json({
    message: "Google login successful",
    accessToken,

    user: {
      id: student.id,
      name: student.name,
      email: student.email,
      username: student.username,
      city: student.city,
      batch: student.batch,
    },
  });
});

// Student Logout
export const logoutStudent = asyncHandler(async (req: Request, res: Response) => {
  // Get student info from middleware
  const studentId = (req as any).student?.id;

  if (studentId) {
    // Clear refresh token from database
    await prisma.student.update({
      where: { id: studentId },
      data: { refresh_token: null }
    });
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({
    message: "Student logout successful",
  });
});

// Admin Logout
export const logoutAdmin = asyncHandler(async (req: Request, res: Response) => {
  // Get admin info from middleware
  const adminId = (req as any).admin?.id;

  if (adminId) {
    // Clear refresh token from database
    await prisma.admin.update({
      where: { id: adminId },
      data: { refresh_token: null }
    });
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({
    message: "Admin logout successful",
  });
});

// Forgot Password - Send OTP
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new ApiError(400, emailValidation.error);
  }

  // Check if user exists (student or admin)
  let user = null;
  user = await prisma.student.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.admin.findUnique({ where: { email } });
  }

  if (!user) {
    console.log(`User not found for email: ${email}`);
    return res.json({
      message: 'If an account with this email exists, an OTP has been sent'
    });
  }

  // Generate and save OTP
  const otp = generateOTP();
  console.log(`Generated OTP for ${email}: ${otp}`);
  await saveOTP(email, otp);
  console.log('OTP saved to database');

  // Send OTP email with user name
  console.log('Attempting to send OTP email...');
  console.log('Email config:', {
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS_SET: !!process.env.EMAIL_PASS,
    EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail'
  });

  await sendOTPEmail(email, otp, user?.name);
  console.log('OTP email sent successfully!');

  res.json({
    message: 'OTP sent to your email address',
    otp: otp  // Return OTP for testing
  });
});

// Reset Password - Verify OTP and reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, 'Email, OTP, and new password are required');
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new ApiError(400, emailValidation.error);
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  // Verify OTP
  console.log(`Attempting to validate OTP: ${otp} for email: ${email}`);
  const isValidOTP = await validateOTP(email, otp);
  console.log(`OTP validation result: ${isValidOTP}`);

  if (!isValidOTP) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  // Find user and update password
  let user = null;
  user = await prisma.student.findUnique({ where: { email } });

  let userType = '';
  if (user) {
    userType = 'student';
  } else {
    user = await prisma.admin.findUnique({ where: { email } });
    if (user) {
      userType = 'admin';
    }
  }

  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  // Check if new password is same as current password (only if user has existing password)
  if (user.password_hash) {
    const isSamePassword = await comparePassword(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new ApiError(400, 'New password cannot be the same as your current password');
    }
  }
  // Hash new password
  const password_hash = await hashPassword(newPassword);

  // Update password based on user type
  if (userType === 'student') {
    await prisma.student.update({
      where: { email },
      data: { password_hash }
    });
  } else {
    await prisma.admin.update({
      where: { email },
      data: { password_hash }
    });
  }

  res.json({
    message: 'Password reset successful. You can now login with your new password.'
  });
});
