"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentProfile = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const updateStudentProfile = async (req, res) => {
    try {
        const studentId = req.user?.id;
        const { leetcode_id, gfg_id, github, linkedin, username } = req.body;
        // Get current student to check if they already have city and batch
        const currentStudent = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            select: { city_id: true, batch_id: true }
        });
        if (!currentStudent) {
            return res.status(404).json({ error: "Student not found" });
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
        // Handle unique constraint errors
        if (error.code === "P2002") {
            const field = error.meta?.target;
            if (field?.includes("username")) {
                return res.status(400).json({ error: "Username already exists" });
            }
            if (field?.includes("email")) {
                return res.status(400).json({ error: "Email already exists" });
            }
        }
        res.status(500).json({ error: "Failed to update profile" });
    }
};
exports.updateStudentProfile = updateStudentProfile;
