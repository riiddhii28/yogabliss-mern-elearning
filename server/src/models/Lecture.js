import mongoose from "mongoose";

// One written or video lesson that belongs to a course.
const lectureSchema = new mongoose.Schema(
  {
    deleting: { type: Boolean, default: false },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    content: { type: String, default: "", trim: true },
    durationMinutes: { type: Number, min: 1 }, // estimated reading/practice time

    // Video URL. A Cloudinary CDN URL in production, or a local "uploads/..." path in dev.
    // Written demo lessons have real content instead of a misleading sample video.
    // Existing video lectures and the admin upload flow remain supported.
    video: { type: String, default: "", required: function () { return !this.content; } },
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
