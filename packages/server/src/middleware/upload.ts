import multer, { StorageEngine, FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Request } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

// Allowed extensions
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

// Max file size from env (in bytes)
const MAX_FILE_SIZE = env.MAX_FILE_SIZE_MB * 1024 * 1024;

// Custom storage with unique filename + checksum
const storage: StorageEngine = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 64);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// File filter: validate MIME and extension
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      AppError.badRequest(
        `Invalid file type: ${file.mimetype}. Only PDF and DOCX are allowed.`,
      ),
    );
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      AppError.badRequest(
        `Invalid file extension: ${ext}. Only .pdf and .docx are allowed.`,
      ),
    );
  }

  cb(null, true);
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files per upload
  },
});

export { upload, uploadDir, MAX_FILE_SIZE, ALLOWED_EXTENSIONS };
