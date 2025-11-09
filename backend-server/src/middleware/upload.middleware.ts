/**
 * Upload Middleware
 * 
 * Provides file upload middleware using multer.
 * Handles file storage, validation, and size limits.
 * 
 * @module middleware/upload.middleware
 */
import path from "path";

import { Request, RequestHandler } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

/**
 * Multer disk storage configuration
 * 
 * Stores files in the uploads directory with unique filenames.
 */
// Configure storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    // You can customize the destination based on project or other criteria
    const uploadPath = path.join(process.cwd(), "uploads");
    cb(null, uploadPath);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

/**
 * File type filter
 * 
 * Validates that uploaded files match allowed MIME types.
 * 
 * @param {Request} req - Express request
 * @param {Express.Multer.File} file - Uploaded file
 * @param {multer.FileFilterCallback} cb - Callback function
 * @returns {void}
 */
// File filter to validate file types
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Add your allowed file types here
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

/**
 * Multer upload middleware
 * 
 * Configured multer instance with disk storage, file filtering, and size limits.
 * Max file size: 50MB
 * Max files per request: 10
 */
// Configure multer
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10, // Max 10 files per request
  },
});

/**
 * Single file upload middleware
 * 
 * Handles upload of a single file in the "file" field.
 */
// Single file upload
export const uploadSingle: RequestHandler = uploadMiddleware.single("file");

/**
 * Multiple files upload middleware
 * 
 * Handles upload of multiple files in the "files" field (max 10 files).
 */
// Multiple files upload
export const uploadMultiple: RequestHandler = uploadMiddleware.array("files", 10);

/**
 * Fields upload middleware
 * 
 * Handles upload of files in multiple named fields:
 * - "avatar": max 1 file
 * - "documents": max 10 files
 */
// Fields upload (different field names)
export const uploadFields: RequestHandler = uploadMiddleware.fields([
  { name: "avatar", maxCount: 1 },
  { name: "documents", maxCount: 10 },
]);
