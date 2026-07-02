import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { cloudinaryEnabled, uploadBuffer } from "../config/cloudinary.js";

// Keep the file in memory so we can send it straight to Cloudinary (or write it to disk in dev).
// 200MB cap so lecture videos fit.
export const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
}).single("file");

// Runs after uploadFile. Persists req.file and sets req.uploaded = { url, publicId, resourceType }.
// - Production (Cloudinary configured): uploads to the CDN, url is a permanent https URL.
// - Local dev: writes to the /uploads folder, url is "uploads/<name>".
export async function storeUpload(req, res, next) {
  try {
    if (!req.file) return next();

    const isVideo = req.file.mimetype?.startsWith("video");

    if (cloudinaryEnabled) {
      const result = await uploadBuffer(req.file.buffer, { resourceType: "auto" });
      req.uploaded = {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type, // "image" | "video"
      };
    } else {
      const name = `${randomUUID()}${path.extname(req.file.originalname)}`;
      await writeFile(path.join("uploads", name), req.file.buffer);
      req.uploaded = {
        url: `uploads/${name}`,
        publicId: "",
        resourceType: isVideo ? "video" : "image",
      };
    }
    next();
  } catch (err) {
    next(err);
  }
}
