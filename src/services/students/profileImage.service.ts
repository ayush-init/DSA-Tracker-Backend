import { S3Service } from '../storage/s3.service';
import prisma from '../../config/prisma';
import { ApiError } from "../../utils/ApiError";

// Helper function to extract S3 key from URL
function getS3KeyFromUrl(url: string): string {
  if (!url) return '';
  const urlParts = url.split('/');
  return urlParts.slice(3).join('/');
}

export class ProfileImageService {
  /**
   * Upload profile image for student
   */
  static async uploadProfileImage(
    studentId: number,
    file: Express.Multer.File
  ): Promise<{ url: string }> {
    try {
      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { profile_image_url: true }
      });

      if (!student) {
        throw new ApiError(400, 'Student not found');
      }

      // Delete old profile image if exists
      if (student.profile_image_url) {
        const oldKey = getS3KeyFromUrl(student.profile_image_url);
        await S3Service.deleteFile(oldKey);
      }

      // Upload new image with student-specific folder
      const result = await S3Service.uploadFile(file, 'profile-images');

      // Update student's profile image URL in database
      await prisma.student.update({
        where: { id: studentId },
        data: { profile_image_url: result.url }
      });

      return { url: result.url };
    } catch (error) {
      console.error('Profile image upload error:', error);
      throw error;
    }
  }

  /**
   * Delete profile image for student
   */
  static async deleteProfileImage(studentId: number): Promise<void> {
    try {
      // Get current student data
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { profile_image_url: true }
      });

      if (!student) {
        throw new ApiError(400, 'Student not found');
      }

      // Delete from S3 if image exists
      if (student.profile_image_url) {
        const key = getS3KeyFromUrl(student.profile_image_url);
        await S3Service.deleteFile(key);
      }

      // Clear profile image URL in database
      await prisma.student.update({
        where: { id: studentId },
        data: { profile_image_url: null }
      });
    } catch (error) {
      console.error('Profile image delete error:', error);
      throw error;
    }
  }

  
   
}