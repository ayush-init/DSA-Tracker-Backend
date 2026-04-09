import prisma from "../../config/prisma";
import { createAdminService } from "../admin/admin-crud.service";
import { hashPassword } from "../../utils/password.util";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.util";
import { validateEmail } from "../../utils/emailValidation.util";
import { validatePasswordForAuth } from "../../utils/passwordValidator.util";
import { ApiError } from "../../utils/ApiError";

export const registerAdmin = async (data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  city_id?: number;
  batch_id?: number;
  currentUserRole?: string;
}) => {
  const { currentUserRole, ...adminData } = data;

  // Only SUPERADMIN can create admins
  if (currentUserRole !== 'SUPERADMIN') {
    throw new ApiError(403, 'Only Super Admin can register new admins', [], "FORBIDDEN");
  }

  // Create admin using the existing service
  const admin = await createAdminService(adminData);

  // Generate tokens
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

  // Update refresh token in database
  await prisma.admin.update({
    where: { id: admin.id },
    data: { refresh_token: refreshToken },
  });

  return {
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
    accessToken,
    refreshToken
  };
};

export const registerStudent = async (data: {
  name: string;
  email: string;
  username: string;
  password: string;
  enrollment_id?: string;
  batch_id: number;
  leetcode_id?: string;
  gfg_id?: string;
}) => {
  const { name, email, username, password, enrollment_id, batch_id, leetcode_id, gfg_id } = data;

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

  // Validate password strength
  validatePasswordForAuth(password);

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
      city_id: batch.city_id,
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

  return student;
};
