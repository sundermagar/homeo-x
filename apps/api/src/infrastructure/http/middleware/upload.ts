import multer from 'multer';
import path from 'path';
import { createLogger } from '../../../shared/logger.js';
import crypto from 'crypto';
import fs from 'fs';

const logger = createLogger('upload-middleware');

// Ensure the local uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to the `uploads` folder in the root workspace
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    // Prepend a safe unique ID and sanitize the original name
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

// File Filter for basic security (Images & PDFs)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp',
    // Documents / PDF
    'application/pdf',
    'text/plain', 'text/csv',
    // Videos
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/mpeg',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn(`Rejected upload attempt with invalid mimetype: ${file.mimetype}`);
    cb(new Error(`File type '${file.mimetype}' is not allowed.`));
  }
};

/**
 * Global upload instance with standard limits (5MB).
 * Note: Apply this middleware explicitly to routes that require file uploads!
 */
export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter,
});
