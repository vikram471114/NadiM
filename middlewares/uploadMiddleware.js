import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Import the file system module
import AppError from '../utils/AppError.js';

// Define the uploads directory path
const uploadDir = 'uploads';

// Ensure the uploads directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


// Configure multer storage
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // The path is now correct and simple
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Configure multer file filter to accept only images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Initialize multer with the storage and filter configurations
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Export a middleware for handling a single image upload for the 'logo' field
export const uploadLogo = upload.single('logo');

