import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { cloudinaryEnabled, uploadBuffer } from "../config/cloudinary.js";
import { uploadsDirectory } from "../services/media.js";
import { httpError } from "../utils/httpError.js";

export const uploadRules = {
  image: { limit: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  video: { limit: 25 * 1024 * 1024, types: ["video/mp4", "video/webm"] },
};

export function uploadFor(kind) {
  const rule = uploadRules[kind];
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: rule.limit, files: 1, fields: 10, fieldSize: 64 * 1024, parts: 11 },
    fileFilter(req, file, callback) {
      if (!rule.types.includes(file.mimetype)) return callback(httpError(415, `Unsupported ${kind} type. Use ${rule.types.join(", ")}.`));
      callback(null, true);
    },
  }).single("file");
}

// MIME headers are user-controlled. Check container signatures as well.
// This is bounded format validation, not full decoding/transcoding of the file.
export function validateUpload(file, kind) {
  if (!file) throw httpError(400, kind === "image" ? "Cover image is required" : "Video file is required");
  const rule = uploadRules[kind];
  const buffer = file.buffer;
  if (file.size > rule.limit || buffer?.length > rule.limit) throw httpError(413, `Upload exceeds the ${rule.limit / 1024 / 1024} MiB ${kind} limit`);
  if (!buffer?.length || !rule.types.includes(file.mimetype)) throw httpError(415, `Invalid ${kind} file`);
  const ascii = (start, end) => buffer.toString("ascii", start, end);
  let extension;
  if (file.mimetype === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) extension = ".jpg";
  if (file.mimetype === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = ".png";
  if (file.mimetype === "image/webp" && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") extension = ".webp";
  if (file.mimetype === "video/mp4" && buffer.length >= 16 && ascii(4, 8) === "ftyp" && /^(isom|iso[2-9]|mp4[12]|avc1|M4V |dash)$/.test(ascii(8, 12))) extension = ".mp4";
  if (file.mimetype === "video/webm" && buffer.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) && buffer.subarray(0, 4096).includes(Buffer.from("webm"))) extension = ".webm";
  if (!extension) throw httpError(415, `File contents do not match a supported ${kind} format`);
  return extension;
}

export async function storeUpload(file, kind) {
  const extension = validateUpload(file, kind);
  if (cloudinaryEnabled) {
    const result = await uploadBuffer(file.buffer, { resourceType: kind });
    return { url: result.secure_url, publicId: result.public_id, resourceType: kind };
  }
  await mkdir(uploadsDirectory, { recursive: true });
  const name = `${randomUUID()}${extension}`;
  const target = path.join(uploadsDirectory, name);
  try { await writeFile(target, file.buffer, { flag: "wx" }); }
  catch (error) {
    // Never remove an existing file, even in the unlikely event of a UUID collision.
    if (error.code !== "EEXIST") await rm(target, { force: true }).catch(() => {});
    throw error;
  }
  return { url: `uploads/${name}`, publicId: "", resourceType: kind };
}
