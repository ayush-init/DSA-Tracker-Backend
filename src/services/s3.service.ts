import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '../config/s3.config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

export class S3Service {
  /**
   * Upload file to S3 bucket
   */
  static async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<{ url: string; key: string }> {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
      const key = `${folder}/${fileName}`;

      // Upload parameters
      const params = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      // Upload to S3
      await s3Client.send(new PutObjectCommand(params));

      // Generate public URL
      const url = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      return { url, key };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Delete file from S3 bucket
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const params = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
      };

      await s3Client.send(new DeleteObjectCommand(params));
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Generate pre-signed URL for file upload (alternative approach)
   */
  static async getUploadUrl(
    fileName: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<{ url: string; key: string }> {
    try {
      const key = `${folder}/${fileName}`;
      
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry

      return { url, key };
    } catch (error) {
      console.error('Presigned URL error:', error);
      throw new Error('Failed to generate upload URL');
    }
  }
}