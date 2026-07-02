import mongoose from "mongoose";

// One video lesson that belongs to a course.
const lectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // Video URL. A Cloudinary CDN URL in production, or a local "uploads/..." path in dev.
    video: { type: String, required: true },
    // Cloudinary public_id (only set when hosted on Cloudinary) — used to delete it.
    videoId: { type: String, default: "" },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Lecture", lectureSchema);
