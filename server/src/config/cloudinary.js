import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { httpError } from "../utils/httpError.js";

// Cloudinary is optional: if these env vars are set (production), uploads go to
// Cloudinary's CDN and persist. If not (local dev), we fall back to disk storage.
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

export const cloudinaryEnabled = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Upload a file buffer to Cloudinary. resourceType "auto" lets it detect image vs video.
export function uploadBuffer(buffer, { folder = "yogabliss", resourceType = "auto" } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: randomUUID(), overwrite: false, resource_type: resourceType },
      (err, result) => (err ? reject(httpError(502, "Media upload failed. Please retry.")) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Delete a previously uploaded asset by its public_id.
export async function destroyAsset(publicId, resourceType = "image") {
  if (!cloudinaryEnabled || !publicId) throw httpError(503, "Media storage is unavailable");
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (!["ok", "not found"].includes(result.result)) throw new Error("Deletion not confirmed");
  } catch {
    throw httpError(502, "Media cleanup failed. Please retry deletion.");
  }
}

export default cloudinary;
