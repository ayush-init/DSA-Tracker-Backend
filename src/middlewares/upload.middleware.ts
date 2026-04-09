import multer from "multer";
import path from "path";

// Storage configuration (memory storage for S3 upload)
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, are allowed.'));
  }
};

// General upload middleware (for files like PDFs, documents)
export const upload = multer({
  storage,
});

// Image upload middleware with file filter and size limits
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).single('file'); // 'file' is the field name in the form