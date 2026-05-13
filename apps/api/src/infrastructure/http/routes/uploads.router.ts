import { Router, type Router as ExpressRouter } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';

export const uploadsRouter: ExpressRouter = Router();

/**
 * GET /api/uploads/:filename
 * Authenticated endpoint to serve uploaded files (patient records, photos, etc.)
 */
uploadsRouter.get('/:filename', authMiddleware, (req, res) => {
  const { filename } = req.params;
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }
  const filePath = path.join(process.cwd(), 'uploads', filename);

  // Security: Prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'));
  
  if (!resolvedPath.startsWith(uploadsDir)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});
