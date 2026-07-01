import mongoose from "mongoose";

// One video lesson that belongs to a course.
const lectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // Path to the video file, served from /uploads.
    video: { type: String, required: true },

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
