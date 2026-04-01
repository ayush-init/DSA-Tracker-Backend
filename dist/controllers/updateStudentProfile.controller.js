"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentProfile = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
exports.updateStudentProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const studentId = req.user?.id;
        const { leetcode_id, gfg_id, github, linkedin, username } = req.body;
        // Get current student to check if they already have city and batch
        const currentStudent = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            select: { city_id: true, batch_id: true }
        });
        if (!currentStudent) {
            throw new ApiError_1.ApiError(404, "Student not found", [], "STUDENT_NOT_FOUND");
        }
        // Build update data - only include fields that are provided
        const updateData = {};
        if (leetcode_id !== undefined)
            updateData.leetcode_id = leetcode_id;
        if (gfg_id !== undefined)
            updateData.gfg_id = gfg_id;
        if (github !== undefined)
            updateData.github = github;
        if (linkedin !== undefined)
            updateData.linkedin = linkedin;
        if (username !== undefined && username.trim())
            updateData.username = username;
        const updated = await prisma_1.default.student.update({
            where: { id: studentId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                leetcode_id: true,
                gfg_id: true,
                github: true,
                linkedin: true,
                city_id: true,
                batch_id: true,
                created_at: true
            }
        });
        res.json({
            message: "Profile updated successfully",
            student: updated,
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        // Handle unique constraint errors
        if (error.code === "P2002") {
            const field = error.meta?.target;
            if (field?.includes("username")) {
                throw new ApiError_1.ApiError(409, "Username already exists", [], "USERNAME_TAKEN");
            }
            if (field?.includes("email")) {
                throw new ApiError_1.ApiError(409, "Email already exists", [], "EMAIL_EXISTS");
            }
        }
        throw new ApiError_1.ApiError(500, "Failed to update profile", [], "INTERNAL_SERVER_ERROR");
    }
});
