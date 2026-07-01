import mongoose from "mongoose";

// Tracks which lectures a user has finished in a course.
const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    completedLectures: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }],
  },
  { timestamps: true }
);

// One progress row per user per course.
progressSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model("Progress", progressSchema);
