// Destructive LOCAL seed only: npm run seed. Never run against production.
// Creates an admin, a demo learner, and three courses with written lessons.
import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "fs/promises";
import { connectDB } from "../config/db.js";
import { cloudinaryEnabled, uploadBuffer } from "../config/cloudinary.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import Progress from "../models/Progress.js";
import { COURSES } from "./catalog.js";
import { seedAccounts } from "./accounts.js";

// Resolve a seed asset to { url, publicId }. In production (Cloudinary configured)
// the local demo file is uploaded to the CDN so it persists; in dev we keep the path.
async function seedAsset(localPath) {
  if (!cloudinaryEnabled) return { url: localPath, publicId: "" };
  const buffer = await readFile(localPath);
  const result = await uploadBuffer(buffer, { resourceType: "auto" });
  return { url: result.secure_url, publicId: result.public_id };
}

async function run() {
  // Validate both accounts before connecting or deleting any data.
  const accounts = seedAccounts(process.env);
  await connectDB(process.env.MONGO_URI);

  // Fresh start.
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Lecture.deleteMany({}),
    Progress.deleteMany({}),
  ]);

  for (const { password, ...data } of accounts) {
    const user = new User(data);
    await user.setPassword(password);
    await user.save();
  }

  // Each course has its own cover and original written curriculum. No video
  // is attached until a suitable recording with known reuse rights is available.
  for (const { lessons, ...data } of COURSES) {
    const cover = await seedAsset(data.image);
    const course = await Course.create({ ...data, image: cover.url, imageId: cover.publicId });
    // Sequential inserts preserve the existing createdAt-based lesson order.
    for (const lesson of lessons) {
      await Lecture.create({ ...lesson, course: course._id });
    }
  }

  console.log("Seeded:");
  console.log("  configured admin and learner accounts created (credentials are not logged)");
  console.log(`  ${COURSES.length} free courses with ${COURSES.reduce((sum, c) => sum + c.lessons.length, 0)} written lessons (no demo videos)`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(() => {
  console.error("Seed failed. Check local seed configuration and database availability; credentials are not logged.");
  process.exit(1);
});
