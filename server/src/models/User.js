import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    passwordHash: { type: String, required: true, select: false },

    // "user" can buy and study courses; "admin" can create them.
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // Courses this user is enrolled in.
    subscription: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  },
  { timestamps: true }
);

// Hash and store a plaintext password.
userSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Safe shape to send to the client — never leak the password hash.
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    subscription: this.subscription,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
