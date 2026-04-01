"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicStudentProfile = exports.getStudentProfile = void 0;
const studentProfile_service_1 = require("../services/studentProfile.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
exports.getStudentProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            throw new ApiError_1.ApiError(500, "Failed to get student profile", [], "INTERNAL_SERVER_ERROR");
        }
        const profile = await (0, studentProfile_service_1.getStudentProfileService)(studentId);
        res.json(profile);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        console.error("Profile error:", error);
        throw new ApiError_1.ApiError(500, error instanceof Error ? error.message : "Failed to get student profile", [], "INTERNAL_SERVER_ERROR");
    }
});
exports.getPublicStudentProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user?.id; // From optional auth middleware
        if (!username || Array.isArray(username)) {
            throw new ApiError_1.ApiError(400, "Username is required", [], "REQUIRED_FIELD");
        }
        const profile = await (0, studentProfile_service_1.getPublicStudentProfileService)(username);
        // Add canEdit flag if current user is viewing their own profile
        const canEdit = currentUserId && profile.student.id === currentUserId;
        res.json({ ...profile, canEdit });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        console.error("Public profile error:", error);
        throw new ApiError_1.ApiError(500, "Failed to get public student profile", [], "INTERNAL_SERVER_ERROR");
    }
});
