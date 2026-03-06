// import jwt from 'jsonwebtoken';
// import { AdminRole } from '@prisma/client';

// interface TokenPayload {
//   id: number;
//   email: string;
//   role: 'student' | AdminRole;
//   userType: 'student' | 'admin';
// }

// export const generateToken = (payload: TokenPayload): string => {
//   return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
// };

// export const verifyToken = (token: string): TokenPayload => {
//   return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
// };        


import jwt from "jsonwebtoken";
import { AdminRole } from "@prisma/client";

export interface AccessTokenPayload {
  id: number;
  email: string;
  role: "STUDENT" | AdminRole;
  userType: "student" | "admin";
  batchId?: number;      // 🔑 Add for students
  batchName?: string;    // 🔑 Add for students
  batchSlug?: string;    // 🔑 Add for students (useful for URLs)
  cityId?: number;       // 🔑 Add for students
  cityName?: string;     // 🔑 Add for students
}

export interface RefreshTokenPayload {
  id: number;
  userType: "student" | "admin";
}

export const generateAccessToken = (
  payload: AccessTokenPayload
): string => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};

export const generateRefreshToken = (
  payload: RefreshTokenPayload
): string => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};

export const verifyAccessToken = (
  token: string
): AccessTokenPayload => {
  return jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET!
  ) as AccessTokenPayload;
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload => {
  return jwt.verify(
    token,
    process.env.REFRESH_TOKEN_SECRET!
  ) as RefreshTokenPayload;
};

