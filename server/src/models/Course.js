import mongoose from "mongoose";

// A yoga course — the thing a user browses and enrolls in.
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: "General" },

    // Path to the cover image, served from /uploads (e.g. "uploads/course-1.jpg").
    image: { type: String, required: true },

    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 }, // in weeks
    createdBy: { type: String, required: true }, // instructor name
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
