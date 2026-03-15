import { Router } from 'express';
import { uploadSingle } from '../middlewares/uploadphoto.middleware';
import { uploadTestFile, testS3Connection } from '../controllers/s3.controller';

const router = Router();

// Test S3 configuration (no file upload required)
router.get('/test', testS3Connection);

// Upload test file
router.post('/upload', uploadSingle, uploadTestFile);

export default router;