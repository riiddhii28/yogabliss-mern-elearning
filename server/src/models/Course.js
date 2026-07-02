import mongoose from "mongoose";

// A yoga course — the thing a user browses and enrolls in.
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: "General" },

    // Cover image URL. A Cloudinary CDN URL in production, or a local "uploads/..."
    // path in dev. Served as-is by the client.
    image: { type: String, required: true },
    // Cloudinary public_id (only set when hosted on Cloudinary) — used to delete it.
    imageId: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 }, // in weeks
    createdBy: { type: String, required: true }, // instructor name
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
