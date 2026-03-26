"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentById = void 0;
const studentProfile_service_1 = require("../services/studentProfile.service");
const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id; // From optional auth middleware
        if (!id || Array.isArray(id)) {
            return res.status(400).json({ error: "Student ID is required" });
        }
        // First get student by ID to find their username
        const prisma = require("../config/prisma").default;
        const student = await prisma.student.findUnique({
            where: { id: parseInt(id) },
            select: { username: true }
        });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        if (!student.username) {
            return res.status(404).json({ error: "Student profile not accessible - username not set" });
        }
        // Use existing service with the username
        const profile = await (0, studentProfile_service_1.getPublicStudentProfileService)(student.username);
        // Add canEdit flag if current user is viewing their own profile
        const canEdit = currentUserId && profile.student.id === currentUserId;
        res.json({ ...profile, canEdit });
    }
    catch (error) {
        console.error("Student by ID error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to get student profile by ID"
        });
    }
};
exports.getStudentById = getStudentById;
