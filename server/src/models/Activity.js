import mongoose from "mongoose";

export const YOGA_TYPES = [
  "Hatha",
  "Vinyasa",
  "Ashtanga",
  "Yin",
  "Restorative",
  "Power",
  "Meditation",
  "Other",
];

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 minute"],
      max: [600, "Duration seems too long"],
    },
    yogaType: {
      type: String,
      enum: YOGA_TYPES,
      default: "Hatha",
    },
    yogaClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "YogaClass",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

// Common query: a user's sessions, newest first.
activitySchema.index({ user: 1, date: -1 });

export default mongoose.model("Activity", activitySchema);
