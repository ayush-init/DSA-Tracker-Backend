"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileImageService = void 0;
const s3_service_1 = require("../services/s3.service");
const prisma_1 = __importDefault(require("../config/prisma"));
// Helper function to extract S3 key from URL
function getS3KeyFromUrl(url) {
    if (!url)
        return '';
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/');
}
class ProfileImageService {
    /**
     * Upload profile image for student
     */
    static async uploadProfileImage(studentId, file) {
        try {
            // Check if student exists
            const student = await prisma_1.default.student.findUnique({
                where: { id: studentId },
                select: { profile_image_url: true }
            });
            if (!student) {
                throw new Error('Student not found');
            }
            // Delete old profile image if exists
            if (student.profile_image_url) {
                const oldKey = getS3KeyFromUrl(student.profile_image_url);
                await s3_service_1.S3Service.deleteFile(oldKey);
            }
            // Upload new image with student-specific folder
            const result = await s3_service_1.S3Service.uploadFile(file, 'profile-images');
            // Update student's profile image URL in database
            await prisma_1.default.student.update({
                where: { id: studentId },
                data: { profile_image_url: result.url }
            });
            return { url: result.url };
        }
        catch (error) {
            console.error('Profile image upload error:', error);
            throw error;
        }
    }
    /**
     * Delete profile image for student
     */
    static async deleteProfileImage(studentId) {
        try {
            // Get current student data
            const student = await prisma_1.default.student.findUnique({
                where: { id: studentId },
                select: { profile_image_url: true }
            });
            if (!student) {
                throw new Error('Student not found');
            }
            // Delete from S3 if image exists
            if (student.profile_image_url) {
                const key = getS3KeyFromUrl(student.profile_image_url);
                await s3_service_1.S3Service.deleteFile(key);
            }
            // Clear profile image URL in database
            await prisma_1.default.student.update({
                where: { id: studentId },
                data: { profile_image_url: null }
            });
        }
        catch (error) {
            console.error('Profile image delete error:', error);
            throw error;
        }
    }
}
exports.ProfileImageService = ProfileImageService;
