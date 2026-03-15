import { Response } from 'express';
import { StudentRequest } from '../middlewares/student.middleware';
import { ProfileImageService } from '../services/profileImage.service';

export const uploadProfileImage = async (req: StudentRequest, res: Response) => {
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
    console.error('Upload profile image error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload profile image' 
    });
  }
};

export const deleteProfileImage = async (req: StudentRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Student ID not found' });
    }

    await ProfileImageService.deleteProfileImage(studentId);

    res.json({
      success: true,
      message: 'Profile image deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete profile image' 
    });
  }
};

export const getProfileImage = async (req: StudentRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Student ID not found' });
    }

    const result = await ProfileImageService.getProfileImage(studentId);

    res.json({
      success: true,
      data: {
        profileImageUrl: result.url
      }
    });
  } catch (error) {
    console.error('Get profile image error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get profile image' 
    });
  }
};