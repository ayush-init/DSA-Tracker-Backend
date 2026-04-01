"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUsername = exports.checkUsernameAvailability = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
exports.checkUsernameAvailability = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const { username, userId } = req.query;
        if (!username || typeof username !== 'string') {
            throw new ApiError_1.ApiError(400, "Username parameter is required", [], "REQUIRED_FIELD");
        }
        // Trim whitespace
        const trimmedUsername = username.trim();
        // Don't check if username is too short
        if (trimmedUsername.length < 3) {
            return res.json({ available: false });
        }
        // Check if username already exists, excluding current user if userId provided
        const whereClause = { username: trimmedUsername };
        // If userId is provided, exclude current user from the check
        if (userId && typeof userId === 'string') {
            whereClause.id = { not: userId };
        }
        const existingStudent = await prisma_1.default.student.findUnique({
            where: whereClause,
            select: { id: true }
        });
        res.json({
            available: !existingStudent
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        console.error("Error checking username availability:", error);
        throw new ApiError_1.ApiError(500, "Failed to check username availability", [], "INTERNAL_SERVER_ERROR");
    }
});
exports.updateUsername = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        console.log('Username update request received');
        console.log('User from token:', req.user);
        console.log('Student ID:', req.studentId);
        const studentId = req.user?.id;
        const { username } = req.body;
        console.log('Request body:', { username });
        if (!username) {
            throw new ApiError_1.ApiError(400, "Username is required", [], "REQUIRED_FIELD");
        }
        if (!studentId) {
            console.log('No student ID found in request');
            throw new ApiError_1.ApiError(401, "Student not authenticated", [], "UNAUTHORIZED");
        }
        // Check if username is already taken
        const existingStudent = await prisma_1.default.student.findFirst({
            where: {
                username: username,
                id: { not: studentId } // Exclude current student
            }
        });
        if (existingStudent) {
            throw new ApiError_1.ApiError(409, "Username is already taken", [], "USERNAME_TAKEN");
        }
        // Update username
        const updated = await prisma_1.default.student.update({
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
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        console.error("Error updating username:", error);
        throw new ApiError_1.ApiError(500, "Failed to update username", [], "INTERNAL_SERVER_ERROR");
    }
});
