import path from "node:path";
import { fileURLToPath } from "node:url";
import { realpath, rm } from "node:fs/promises";
import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import { destroyAsset } from "../config/cloudinary.js";

export const uploadsDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));

// Restrict disk operations to generated/legacy files directly inside uploads.
function localName(url) {
  return typeof url === "string" && /^uploads\/[\w.-]+$/.test(url) ? url.slice(8) : null;
}

function cloudIdentity(asset) {
  try {
    const url = new URL(asset.url);
    if (url.hostname !== "res.cloudinary.com") return null;
    const match = url.pathname.match(/^\/([^/]+)\/(image|video)\/upload\/(.+)$/);
    if (!match) return null;
    // Versioned URLs permit comparison with older records missing public IDs,
    // including resized/transformed URLs. Ambiguous URLs are retained safely.
    const versioned = match[3].match(/(?:^|\/)v\d+\/(.+)$/);
    const publicId = asset.publicId || (versioned && decodeURIComponent(versioned[1]).replace(/\.[^/.]+$/, ""));
    return publicId ? `${match[1]}/${match[2]}/${publicId}` : null;
  } catch { return null; }
}

export function sameAsset(a, b) {
  if (a.url && a.url === b.url) return true;
  const localReference = (url) => {
    const direct = localName(url);
    if (direct) return direct;
    try { return localName(new URL(url).pathname.slice(1)); }
    catch { return null; }
  };
  const local = localReference(a.url);
  if (local && local === localReference(b.url)) return true;
  const first = cloudIdentity(a);
  const second = cloudIdentity(b);
  if (first && second && first === second) return true;
  // An unversioned legacy Cloudinary URL without a public ID is ambiguous.
  // Keep assets in that cloud/type rather than risk deleting its source file.
  const cloudScope = (asset) => {
    try {
      const url = new URL(asset.url);
      return url.hostname === "res.cloudinary.com" ? url.pathname.match(/^\/[^/]+\/(image|video)\/upload\//)?.[0] : null;
    } catch { return null; }
  };
  const scope = cloudScope(a);
  if ((!first || !second) && scope && scope === cloudScope(b)) return true;
  // Conservatively protect records storing only public IDs or unusual CDN URLs.
  return Boolean(a.publicId && a.publicId === b.publicId && a.resourceType === b.resourceType);
}

// Owner may be excluded only while that marked-for-deletion record still exists.
export async function removeUnusedMedia(asset, owner = {}) {
  if (!asset.url && !asset.publicId) return { deleted: false, reason: "empty" };
  const [courses, lectures] = await Promise.all([
    Course.find(owner.course ? { _id: { $ne: owner.course } } : {}).select("image imageId"),
    Lecture.find(owner.lecture ? { _id: { $ne: owner.lecture } } : {}).select("video videoId"),
  ]);
  const references = [
    ...courses.map((c) => ({ url: c.image, publicId: c.imageId, resourceType: "image" })),
    ...lectures.map((l) => ({ url: l.video, publicId: l.videoId, resourceType: "video" })),
  ];
  if (references.some((reference) => sameAsset(asset, reference))) return { deleted: false, reason: "shared" };

  const identity = cloudIdentity(asset);
  if (identity && asset.publicId) {
    // Never use configured credentials to delete a different cloud's public ID.
    if (!identity.startsWith(`${process.env.CLOUDINARY_CLOUD_NAME}/`)) return { deleted: false, reason: "unmanaged" };
    await destroyAsset(asset.publicId, asset.resourceType);
    return { deleted: true };
  }
  const name = localName(asset.url);
  if (!name || name === "." || name === "..") return { deleted: false, reason: "unmanaged" };
  const target = path.join(uploadsDirectory, name);
  try {
    const [root, resolved] = await Promise.all([realpath(uploadsDirectory), realpath(target)]);
    if (path.dirname(resolved) !== root) return { deleted: false, reason: "unmanaged" };
    await rm(target, { force: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return { deleted: true };
}

export const courseMedia = (course) => ({ url: course.image, publicId: course.imageId, resourceType: "image" });
export const lectureMedia = (lecture) => ({ url: lecture.video, publicId: lecture.videoId, resourceType: "video" });
