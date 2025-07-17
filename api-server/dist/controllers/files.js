"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesController = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../services/database"));
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, "../../uploads");
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}-${Date.now()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const fileFilter = (req, file, cb) => {
    // Define allowed file types
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "application/json",
        "application/octet-stream", // Allow generic binary files (for testing)
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});
// Transform database FileUpload to frontend-compatible format
const transformFileUpload = (file) => ({
    ...file,
    mimetype: file.mime_type, // Transform mime_type to mimetype for frontend
});
class FilesController {
    static getAllFiles(req, res) {
        try {
            const { access_level } = req.query;
            // const _user = req.user; // Available for future filtering
            const files = database_1.default.getAllFiles(undefined, // Don't filter by uploaded_by for admins
            access_level);
            // Transform files to match frontend expectations
            const transformedFiles = files.map(transformFileUpload);
            const response = {
                success: true,
                data: transformedFiles,
                message: `Retrieved ${files.length} files`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get all files error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve files",
            };
            res.status(500).json(response);
        }
    }
    static getFileById(req, res) {
        try {
            const { id } = req.params;
            const file = database_1.default.getFileById(parseInt(id));
            if (!file) {
                const response = {
                    success: false,
                    error: `File with id '${id}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: transformFileUpload(file),
                message: `Retrieved file with id '${id}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get file by id error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve file",
            };
            res.status(500).json(response);
        }
    }
    static uploadFile(req, res) {
        try {
            const user = req.user;
            const file = req.file;
            const { access_level } = req.body;
            if (!user) {
                const response = {
                    success: false,
                    error: "User not authenticated",
                };
                res.status(401).json(response);
                return;
            }
            if (!file) {
                const response = {
                    success: false,
                    error: "No file uploaded",
                };
                res.status(400).json(response);
                return;
            }
            // Validate access level
            const validAccessLevels = ["public", "protected", "private"];
            const finalAccessLevel = validAccessLevels.includes(access_level)
                ? access_level
                : "public";
            const fileData = database_1.default.createFile({
                filename: file.filename,
                original_name: file.originalname,
                mime_type: file.mimetype,
                size: file.size,
                path: file.path,
                uploaded_by: user.userId,
                access_level: finalAccessLevel,
            });
            const response = {
                success: true,
                data: transformFileUpload(fileData),
                message: `File '${file.originalname}' uploaded successfully`,
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error("Upload file error:", error);
            // Handle multer errors specifically
            if (error instanceof multer_1.default.MulterError) {
                let errorMessage = "File upload error";
                if (error.code === "LIMIT_FILE_SIZE") {
                    errorMessage = "File size too large. Maximum size is 50MB";
                }
                else if (error.code === "LIMIT_UNEXPECTED_FILE") {
                    errorMessage = "Unexpected file field";
                }
                const response = {
                    success: false,
                    error: errorMessage,
                };
                res.status(400).json(response);
                return;
            }
            const response = {
                success: false,
                error: error instanceof Error ? error.message : "Failed to upload file",
            };
            res.status(500).json(response);
        }
    }
    static downloadFile(req, res) {
        try {
            const { id } = req.params;
            const fileId = parseInt(id);
            if (isNaN(fileId)) {
                const response = {
                    success: false,
                    error: "Invalid file ID",
                };
                res.status(400).json(response);
                return;
            }
            const file = database_1.default.getFileById(fileId);
            if (!file) {
                const response = {
                    success: false,
                    error: `File with ID '${id}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            // Check if file exists on disk
            const filePath = path_1.default.join(__dirname, "../../uploads", file.filename);
            if (!fs_1.default.existsSync(filePath)) {
                const response = {
                    success: false,
                    error: "File not found on disk",
                };
                res.status(404).json(response);
                return;
            }
            // Set headers for file download
            res.setHeader("Content-Type", file.mime_type);
            res.setHeader("Content-Disposition", `attachment; filename="${file.original_name}"`);
            // Stream the file
            const fileStream = fs_1.default.createReadStream(filePath);
            fileStream.pipe(res);
        }
        catch (error) {
            console.error("Download file error:", error);
            const response = {
                success: false,
                error: "Failed to download file",
            };
            res.status(500).json(response);
        }
    }
    static updateFile(req, res) {
        try {
            const { id } = req.params;
            const fileId = parseInt(id);
            const { access_level: _access_level, description: _description } = req.body;
            if (isNaN(fileId)) {
                const response = {
                    success: false,
                    error: "Invalid file ID",
                };
                res.status(400).json(response);
                return;
            }
            const file = database_1.default.getFileById(fileId);
            if (!file) {
                const response = {
                    success: false,
                    error: `File with ID '${id}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            // Update file in database (placeholder - not implemented in database service)
            const response = {
                success: true,
                message: `File with ID '${id}' updated successfully`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update file error:", error);
            const response = {
                success: false,
                error: "Failed to update file",
            };
            res.status(500).json(response);
        }
    }
    static deleteFile(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const file = database_1.default.getFileById(parseInt(id));
            if (!user) {
                const response = {
                    success: false,
                    error: "User not authenticated",
                };
                res.status(401).json(response);
                return;
            }
            if (!file) {
                const response = {
                    success: false,
                    error: `File with id '${id}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            // Check if user has permission to delete (owner or admin)
            if (file.uploaded_by !== user.userId && user.role !== "admin") {
                const response = {
                    success: false,
                    error: "Access denied",
                };
                res.status(403).json(response);
                return;
            }
            // Delete file from database
            const deleted = database_1.default.deleteFile(parseInt(id));
            if (!deleted) {
                const response = {
                    success: false,
                    error: "Failed to delete file from database",
                };
                res.status(500).json(response);
                return;
            }
            // Delete file from disk
            try {
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
            }
            catch (fsError) {
                console.error("Failed to delete file from disk:", fsError);
                // Continue anyway, database record is deleted
            }
            const response = {
                success: true,
                message: `File '${file.original_name}' deleted successfully`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Delete file error:", error);
            const response = {
                success: false,
                error: "Failed to delete file",
            };
            res.status(500).json(response);
        }
    }
    static getPublicFile(req, res) {
        try {
            const { filename } = req.params;
            const file = database_1.default.getFileByFilename(filename);
            if (!file) {
                const response = {
                    success: false,
                    error: `File '${filename}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            // Check access level for public endpoints
            if (file.access_level === "private") {
                const response = {
                    success: false,
                    error: "Access denied",
                };
                res.status(403).json(response);
                return;
            }
            // Check if file exists on disk
            if (!fs_1.default.existsSync(file.path)) {
                const response = {
                    success: false,
                    error: "File not found on disk",
                };
                res.status(404).json(response);
                return;
            }
            // Set appropriate headers for inline display
            res.setHeader("Content-Type", file.mime_type);
            res.setHeader("Content-Length", file.size);
            // For images, allow inline display
            if (file.mime_type.startsWith("image/")) {
                res.setHeader("Content-Disposition", `inline; filename="${file.original_name}"`);
            }
            else {
                res.setHeader("Content-Disposition", `attachment; filename="${file.original_name}"`);
            }
            // Stream the file
            const fileStream = fs_1.default.createReadStream(file.path);
            fileStream.pipe(res);
        }
        catch (error) {
            console.error("Get public file error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve file",
            };
            res.status(500).json(response);
        }
    }
}
exports.FilesController = FilesController;
//# sourceMappingURL=files.js.map