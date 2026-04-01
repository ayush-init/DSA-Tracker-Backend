import { Request, Response } from "express";
import prisma from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const checkUsernameAvailability = asyncHandler(async (req: Request, res: Response) => {
          try {
            const { username, userId } = req.query;

            if (!username || typeof username !== 'string') {
              throw new ApiError(400, "Username parameter is required", [], "REQUIRED_FIELD");
            }

            // Trim whitespace
            const trimmedUsername = username.trim();

            // Don't check if username is too short
            if (trimmedUsername.length < 3) {
              return res.json({ available: false });
            }

            // Check if username already exists, excluding current user if userId provided
            const whereClause: any = { username: trimmedUsername };
            
            // If userId is provided, exclude current user from the check
            if (userId && typeof userId === 'string') {
              whereClause.id = { not: userId };
            }

            const existingStudent = await prisma.student.findUnique({
              where: whereClause,
              select: { id: true }
            });

            res.json({ 
              available: !existingStudent 
            });
          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error("Error checking username availability:", error);
            throw new ApiError(500, "Failed to check username availability", [], "INTERNAL_SERVER_ERROR");
          }
        });

export const updateUsername = asyncHandler(async (req: Request, res: Response) => {
          try {
            console.log('Username update request received');
            console.log('User from token:', req.user);
            console.log('Student ID:', (req as any).studentId);
            
            const studentId = req.user?.id;
            const { username } = req.body;

            console.log('Request body:', { username });

            if (!username) {
              throw new ApiError(400, "Username is required", [], "REQUIRED_FIELD");
            }

            if (!studentId) {
              console.log('No student ID found in request');
              throw new ApiError(401, "Student not authenticated", [], "UNAUTHORIZED");
            }

            // Check if username is already taken
            const existingStudent = await prisma.student.findFirst({
              where: {
                username: username,
                id: { not: studentId } // Exclude current student
              }
            });

            if (existingStudent) {
              throw new ApiError(409, "Username is already taken", [], "USERNAME_TAKEN");
            }

            // Update username
            const updated = await prisma.student.update({
              where: { id: studentId },
              data: { username },
              select: {
                id: true,
                username: true,
                name: true,
                email: true
              }
            });

            console.log('Username updated successfully:', updated);

            res.json({
              message: "Username updated successfully",
              user: updated,
            });
          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error("Error updating username:", error);
            throw new ApiError(500, "Failed to update username", [], "INTERNAL_SERVER_ERROR");
          }
        });
