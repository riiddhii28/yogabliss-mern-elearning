import mongoose from "mongoose";

// A yoga course — the thing a user browses and enrolls in.
const courseSchema = new mongoose.Schema(
  {
    // Retain the record/media references if a multi-step deletion needs retrying.
    deleting: { type: Boolean, default: false },
    // Unlisted legacy lessons keep their original createdAt/_id order.
    lessonOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }],
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: "General" },
    level: { type: String, default: "" },
    learningOutcomes: [{ type: String, trim: true }],

    // Cover image URL. A Cloudinary CDN URL in production, or a local "uploads/..."
    // path in dev. Served as-is by the client.
    image: { type: String, required: true },
    // Cloudinary public_id (only set when hosted on Cloudinary) — used to delete it.
    imageId: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 },
    // Older/admin-created courses retain their existing week-based duration.
    durationUnit: { type: String, enum: ["weeks", "minutes"], default: "weeks" },
    createdBy: { type: String, required: true }, // author or instructor name
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
