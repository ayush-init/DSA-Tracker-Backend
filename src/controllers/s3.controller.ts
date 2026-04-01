import { Request, Response } from 'express';
import { S3Service } from '../services/s3.service';
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const uploadTestFile = asyncHandler(async (req: Request, res: Response) => {
          try {
            // Check if file was uploaded
            if (!req.file) {
              throw new ApiError(400, 'No file uploaded. Please provide a file with field name "file"', [], "REQUIRED_FIELD");
            }

            // Upload file to S3
            const result = await S3Service.uploadFile(req.file, 'test-uploads');

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

          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error('Upload controller error:', error);
            throw new ApiError(500, error instanceof Error ? error.message : 'Failed to upload file', [], "FILE_UPLOAD_ERROR");
          }
        });

export const testS3Connection = asyncHandler(async (req: Request, res: Response) => {
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
          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error('S3 test error:', error);
            throw new ApiError(500, 'S3 configuration test failed', [], "EXTERNAL_SERVICE_ERROR");
          }
        });