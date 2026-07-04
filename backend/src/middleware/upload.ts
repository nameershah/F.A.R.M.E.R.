import multer from "multer";
import { resolveDefault } from "../lib/resolveDefault.js";

const multerFn = resolveDefault(multer);

// ==========================================
// SECURITY AUDIT: FILE UPLOAD HARDENING (INTEGRITY)
// ==========================================
// Restricts uploaded leaf files to JPEG/PNG format and 8MB maximum size.
// This prevents processing of malicious scripts, SVG injections, or huge files.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
]);

export const upload = multerFn({
  storage: multerFn.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Only JPEG or PNG images are allowed."));
      return;
    }
    cb(null, true);
  },
});
