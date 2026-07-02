import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// Fail fast with a clear message instead of booting broken.
function validateEnv() {
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required env var(s): ${missing.join(", ")}. See server/.env.example.`
    );
  }
  if (process.env.NODE_ENV === "production") {
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET is too short for production (need 32+ chars).");
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn(
        "WARNING: Cloudinary is not configured — uploads will go to the ephemeral disk and be lost on restart."
      );
    }
  }
}

async function start() {
  validateEnv();
  try {
    await connectDB(process.env.MONGO_URI);
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`YogaBliss API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
