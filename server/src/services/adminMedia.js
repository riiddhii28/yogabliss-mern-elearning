import { validateUpload, storeUpload } from "../middleware/upload.js";
import { removeUnusedMedia, courseMedia, lectureMedia } from "./media.js";
import { versionFilter } from "./lessonOrder.js";
import { httpError } from "../utils/httpError.js";

async function cleanup(asset) {
  try { await removeUnusedMedia(asset); return ""; }
  catch {
    console.error("Media cleanup needs reconciliation:", asset.publicId || asset.url);
    return "Changes saved, but old media cleanup needs administrator attention.";
  }
}

// Validate first, upload to a new ID, commit, then clean the previous asset.
export async function saveAdminDocument(document, fields, file, kind) {
  const isNew = document.isNew;
  const old = kind === "image" ? courseMedia(document) : lectureMedia(document);
  const mediaKey = kind === "image" ? "image" : "video";
  const idKey = kind === "image" ? "imageId" : "videoId";
  if (file) validateUpload(file, kind);
  if (!file && isNew && (kind === "image" || !fields.content)) throw httpError(400, kind === "image" ? "Cover image is required" : "Video file is required");
  document.set({ ...fields, ...(file && { [mediaKey]: "pending-upload" }) });
  await document.validate();
  let uploaded;
  if (file) uploaded = await storeUpload(file, kind);
  const values = { ...fields, ...(uploaded && { [mediaKey]: uploaded.url, [idKey]: uploaded.publicId }) };
  let saved;
  try {
    if (isNew) { document.set(values); saved = await document.save(); }
    else {
      saved = await document.constructor.findOneAndUpdate(
        { _id: document._id, deleting: { $ne: true }, ...versionFilter(document) },
        { $set: values, $inc: { __v: 1 } }, { new: true, runValidators: true }
      );
      if (!saved) throw httpError(409, "This item changed. Reload before saving again.");
    }
  } catch (error) {
    if (uploaded) await cleanup(uploaded); // A committed-but-unacknowledged write is protected by reference checks.
    throw error;
  }
  const warning = uploaded && !isNew ? await cleanup(old) : "";
  return { saved, warning };
}
