import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../../../shared/logger';
import crypto from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('upload-middleware');

// Ensure the local uploads directory exists
const uploadDir = path.join(__dirname, '../../../../uploads');
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
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain', 'text/csv'
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});
