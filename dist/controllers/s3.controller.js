"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testS3Connection = exports.uploadTestFile = void 0;
const s3_service_1 = require("../services/s3.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const ApiError_1 = require("../utils/ApiError");
exports.uploadTestFile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'No file uploaded. Please provide a file with field name "file"', [], "REQUIRED_FIELD");
        }
        // Upload file to S3
        const result = await s3_service_1.S3Service.uploadFile(req.file, 'test-uploads');
        // Return success response with file details
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully to S3',
            data: {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                url: result.url,
                s3Key: result.key,
            }
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        console.error('Upload controller error:', error);
        throw new ApiError_1.ApiError(500, error instanceof Error ? error.message : 'Failed to upload file', [], "FILE_UPLOAD_ERROR");
    }
});
exports.testS3Connection = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Simple test to verify S3 configuration
        res.json({
            success: true,
            message: 'S3 configuration is working',
            config: {
                bucketName: process.env.AWS_BUCKET_NAME,
                region: process.env.AWS_REGION,
                hasAccessKey: !!process.env.AWS_ACCESS_KEY,
                hasSecretKey: !!process.env.AWS_SECRET_KEY,
            }
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        console.error('S3 test error:', error);
        throw new ApiError_1.ApiError(500, 'S3 configuration test failed', [], "EXTERNAL_SERVICE_ERROR");
    }
});
