import { Response } from 'express';
import { StudentRequest } from '../middlewares/student.middleware';
import { ProfileImageService } from '../services/students/profileImage.service';
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const uploadProfileImage = asyncHandler(async (req: StudentRequest, res: Response) => {
          try {
            const studentId = req.user?.id;

            if (!studentId) {
              throw new ApiError(401, 'Student ID not found');
            }

            if (!req.file) {
              throw new ApiError(400, 'No file uploaded. Please provide a file with field name "file"');
            }

            const result = await ProfileImageService.uploadProfileImage(studentId, req.file);

            res.status(201).json({
              success: true,
              message: 'Profile image uploaded successfully',
              data: {
                profileImageUrl: result.url,
                fileName: req.file.originalname,
                fileSize: req.file.size
              }
            });
          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error('Upload profile image error:', error);
            throw new ApiError(500, error instanceof Error ? error.message : 'Failed to upload profile image');
          }
        });

export const deleteProfileImage = asyncHandler(async (req: StudentRequest, res: Response) => {
          try {
            const studentId = req.user?.id;

            if (!studentId) {
              throw new ApiError(401, 'Student ID not found');
            }

            await ProfileImageService.deleteProfileImage(studentId);

            res.json({
              success: true,
              message: 'Profile image deleted successfully'
            });
          } catch (error) {
    if (error instanceof ApiError) throw error;
            console.error('Delete profile image error:', error);
            throw new ApiError(500, error instanceof Error ? error.message : 'Failed to delete profile image');
          }
        });

