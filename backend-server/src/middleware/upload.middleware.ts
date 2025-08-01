import multer from "multer";
import path from "path";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // You can customize the destination based on project or other criteria
    const uploadPath = path.join(process.cwd(), "uploads");
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter to validate file types
const fileFilter = (
  req: Request,
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

// Configure multer
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10, // Max 10 files per request
  },
});

// Single file upload
export const uploadSingle: multer.Multer = uploadMiddleware.single(
  "file"
) as any;

// Multiple files upload
export const uploadMultiple: multer.Multer = uploadMiddleware.array(
  "files",
  10
) as any;

// Fields upload (different field names)
export const uploadFields: multer.Multer = uploadMiddleware.fields([
  { name: "avatar", maxCount: 1 },
  { name: "documents", maxCount: 10 },
]) as any;
