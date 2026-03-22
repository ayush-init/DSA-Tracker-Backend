import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { OAuth2Client } from 'google-auth-library';
import { generateOTP, saveOTP, validateOTP } from '../utils/otp.util';
import { sendOTPEmail } from '../utils/email.util';
import { validateEmail } from '../utils/emailValidation.util';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Student Registration
export const registerStudent = async (req: Request, res: Response) => {
  try {
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
      return res.status(400).json({
        error: 'Name, email, username, password, and batch_id are required'
      });
    }

    // Validate email domain
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.error
      });
    }

    // Check existing user
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [{ email }, { username }, { enrollment_id }],
      },
    });

    if (existingStudent) {
      return res.status(400).json({
        error: 'Email, username, or enrollment_id already exists'
      });
    }

    // Get batch information to fetch city_id
    const batch = await prisma.batch.findUnique({
      where: { id: batch_id },
      include: { city: true }
    });

    if (!batch) {
      return res.status(400).json({ error: 'Invalid batch_id' });
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

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register student' });
  }
};

// Student Login
export const loginStudent = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({
        error: 'Either email or username with password are required'
      });
    }

    // Validate email domain if email is provided
    if (email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({
          error: emailValidation.error
        });
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isValidPassword = await comparePassword(password, student.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Admin/Teacher Registration
export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check existing admin
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        email,
      },
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    if (req.user?.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Only SuperAdmin can create admin" });
    }

    if (role !== "TEACHER" && role !== "INTERN" && role !== "SUPERADMIN") {
      return res.status(400).json({ error: "Invalid role type" });
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
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({ error: 'Failed to register admin' });
  }
};


// Admin Login
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await comparePassword(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Adding  Referesh Token API


export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Get refresh token from HTTP-only cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
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
      return res.status(403).json({ error: 'Invalid refresh token' });
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
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
};


export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "ID token required" });
    }

    // Verify token with Google
    async function verifyIdToken(idToken: string) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        const tokenInfo: any = await response.json();

        if (tokenInfo.error) {
          throw new Error(tokenInfo.error);
        }

        return tokenInfo;
      } catch (error) {
        throw new Error('Failed to verify Google token');
      }
    }

    const payload = await verifyIdToken(idToken);

    if (!payload?.email) {
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const email = payload.email;
    const googleId = payload.sub;

    // Validate email domain
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.error
      });
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
      return res.status(403).json({
        error: "Student not registered by admin",
      });
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
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ error: "Invalid Google token" });
  }
};

// Student Logout
export const logoutStudent = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error("Student logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
};

// Admin Logout
export const logoutAdmin = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error("Admin logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
};

// Forgot Password - Send OTP
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email domain
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.error
      });
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
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Reset Password - Verify OTP and reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: 'Email, OTP, and new password are required'
      });
    }

    // Validate email domain
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.error
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Verify OTP
    console.log(`Attempting to validate OTP: ${otp} for email: ${email}`);
    const isValidOTP = await validateOTP(email, otp);
    console.log(`OTP validation result: ${isValidOTP}`);

    if (!isValidOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
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
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
