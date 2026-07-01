import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    weeklyGoalMinutes: {
      type: Number,
      default: 150,
      min: 0,
      max: 10000,
    },
  },
  { timestamps: true }
);

// Hash a plaintext password and store it. Call before save.
userSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Shape returned to clients — never leak the hash.
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    weeklyGoalMinutes: this.weeklyGoalMinutes,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
