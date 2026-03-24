"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeProfile = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const completeProfile = async (req, res) => {
    try {
        const studentId = req.user?.id;
        const { city_id, batch_id, leetcode_id, gfg_id, github, linkedin, username } = req.body;
        if (!city_id || !batch_id) {
            return res.status(400).json({ error: "City and Batch required" });
        }
        // Validate batch belongs to city
        const batch = await prisma_1.default.batch.findUnique({
            where: { id: batch_id },
        });
        if (!batch || batch.city_id !== city_id) {
            return res.status(400).json({ error: "Invalid batch for selected city" });
        }
        const updated = await prisma_1.default.student.update({
            where: { id: studentId },
            data: {
                city_id,
                batch_id,
                leetcode_id,
                gfg_id,
                github,
                linkedin,
                ...(username ? { username } : {})
            },
        });
        res.json({
            message: "Profile completed",
            user: updated,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to complete profile" });
    }
};
exports.completeProfile = completeProfile;
