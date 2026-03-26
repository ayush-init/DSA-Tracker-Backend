"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProfileImage = exports.uploadProfileImage = void 0;
const profileImage_service_1 = require("../services/profileImage.service");
const uploadProfileImage = async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded. Please provide a file with field name "file"'
            });
        }
        const result = await profileImage_service_1.ProfileImageService.uploadProfileImage(studentId, req.file);
        res.status(201).json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                profileImageUrl: result.url,
                fileName: req.file.originalname,
                fileSize: req.file.size
            }
        });
    }
    catch (error) {
        console.error('Upload profile image error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to upload profile image'
        });
    }
};
exports.uploadProfileImage = uploadProfileImage;
const deleteProfileImage = async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Student ID not found' });
        }
        await profileImage_service_1.ProfileImageService.deleteProfileImage(studentId);
        res.json({
            success: true,
            message: 'Profile image deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete profile image error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to delete profile image'
        });
    }
};
exports.deleteProfileImage = deleteProfileImage;
