/**
 * Express Types - Express.js type declarations and extensions
 * Global type declarations for Express Request interface extensions
 */

import { AdminRole } from "@prisma/client";
import { AccessTokenPayload } from './auth.types';
import { Request, Response, NextFunction } from 'express';

// Global Express type declarations
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Middleware-specific request interfaces
export interface AdminRequest extends Request {
  admin?: {
    id: number;
    email: string;
    name: string;
    role: AdminRole;
    city_id?: number;
    cityName?: string;
  };
}

export interface StudentRequest extends Request {
  user?: AccessTokenPayload & {
    userType: "student";
  };
  batchId?: number;
  batchName?: string;
}

// Express middleware types
export type ExpressRequest = Request;
export type ExpressResponse = Response;
export type ExpressNextFunction = NextFunction;

// File upload types
export interface MulterFile {
  buffer: Buffer;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Request context types
export interface RequestWithUser extends Request {
  user: AccessTokenPayload;
}

export interface RequestWithAdmin extends Request {
  admin: {
    id: number;
    email: string;
    name: string;
    role: AdminRole;
    city_id?: number;
    cityName?: string;
  };
}

export interface RequestWithStudent extends Request {
  user: AccessTokenPayload & {
    userType: "student";
  };
  batchId?: number;
  batchName?: string;
}
