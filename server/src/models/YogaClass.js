import mongoose from "mongoose";

export const CLASS_LEVELS = ["Beginner", "Intermediate", "Advanced"];

const yogaClassSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    level: {
      type: String,
      enum: CLASS_LEVELS,
      default: "Beginner",
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 600,
    },
    focus: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("YogaClass", yogaClassSchema);
