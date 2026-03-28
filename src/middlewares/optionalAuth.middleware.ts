import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    // No token provided, continue without authentication
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user from database
    const user = await prisma.student.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      // Invalid token, continue without authentication
      return next();
    }

    // Attach user to request with same structure as other middleware
    (req as any).user = user;
    next();
  } catch (error) {
    // Invalid token, continue without authentication
    next();
  }
};
