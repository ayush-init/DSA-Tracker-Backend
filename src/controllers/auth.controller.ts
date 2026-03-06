import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateAccessToken,generateRefreshToken } from '../utils/jwt.util';
import { OAuth2Client } from "google-auth-library";


const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);
// Student Registration
export const registerStudent = async (req: Request, res: Response) => {
  try {
    const { name, email, username, password } = req.body;

    // Validation
    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check existing user
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingStudent) {
      return res.status(400).json({ error: 'Email or username already exists' });
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
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        is_profile_complete: true,
        created_at: true,
      },
    });

    const accessToken = generateAccessToken({
      id: student.id,
      email: student.email,
      role: 'STUDENT',
      userType: 'student',
    });

    const refreshToken = generateRefreshToken({
      id: student.id,
      userType: 'student',
    });

    // Save refresh token
    await prisma.student.update({
      where: { id: student.id },
      data: { refresh_token: refreshToken },
    });


    res.status(201).json({
      message: 'Student registered successfully',
      accessToken,
      refreshToken,
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find student
    const student = await prisma.student.findUnique({
      where: { email },
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
    });

    const refreshToken = generateRefreshToken({
      id: student.id,
      userType: 'student',
    });

    await prisma.student.update({
      where: { id: student.id },
      data: { refresh_token: refreshToken },
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        username: student.username,
        city: student.city,
        batch: student.batch,
        is_profile_complete: student.is_profile_complete,
        leetcode_id: student.leetcode_id,
        gfg_id: student.gfg_id,
        defaultCityId: student.city_id,
        defaultCityName: student.city?.city_name || null,
        defaultBatchId: student.batch_id,
        defaultBatchName: student.batch?.batch_name || null,
        defaultBatchSlug: student.batch?.slug || null,
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
    const { name, email, username, password, role } = req.body;

    if (!name || !email || !username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check existing admin
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    if (req.user?.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Only SuperAdmin can create admin" });
    }

    if (role !== "TEACHER" && role !== "INTERN") {
      return res.status(400).json({ error: "Invalid role type" });
    }
    const password_hash = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        username,
        password_hash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
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
      refreshToken,
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
    });

    const refreshToken = generateRefreshToken({
      id: admin.id,
      userType: 'admin',
    });

    await prisma.admin.update({
      where: { id: admin.id },
      data: { refresh_token: refreshToken },
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Adding  Referesh Token API

import { verifyRefreshToken } from '../utils/jwt.util';

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    let user: any;

    if (decoded.userType === 'admin') {
      user = await prisma.admin.findUnique({
        where: { id: decoded.id },
      });
    } else {
      user = await prisma.student.findUnique({
        where: { id: decoded.id },
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
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const email = payload.email;
    const googleId = payload.sub;

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
      refreshToken,
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