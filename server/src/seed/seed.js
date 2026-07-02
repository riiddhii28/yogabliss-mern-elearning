// Seeds demo data so the app looks alive on first run:  npm run seed
// Creates an admin, a demo learner, a few courses, and video lectures.
import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "fs/promises";
import { connectDB } from "../config/db.js";
import { cloudinaryEnabled, uploadBuffer } from "../config/cloudinary.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import Progress from "../models/Progress.js";

// Resolve a seed asset to { url, publicId }. In production (Cloudinary configured)
// the local demo file is uploaded to the CDN so it persists; in dev we keep the path.
async function seedAsset(localPath) {
  if (!cloudinaryEnabled) return { url: localPath, publicId: "" };
  const buffer = await readFile(localPath);
  const result = await uploadBuffer(buffer, { resourceType: "auto" });
  return { url: result.secure_url, publicId: result.public_id };
}

const COURSES = [
  {
    title: "Foundations of Hatha Yoga",
    description:
      "Build a strong base with classic Hatha postures, breathing, and alignment. Perfect for beginners starting their journey to inner calm.",
    category: "Beginner",
    createdBy: "Ananya Rao",
    duration: 4,
    price: 499,
    image: "uploads/course-1.jpg",
  },
  {
    title: "Vinyasa Flow & Strength",
    description:
      "Link breath to movement in dynamic flows that build heat, flexibility, and full-body strength. Best for those with some yoga experience.",
    category: "Intermediate",
    createdBy: "Ravi Menon",
    duration: 6,
    price: 899,
    image: "uploads/course-2.jpg",
  },
  {
    title: "Mindful Meditation & Breathwork",
    description:
      "Calm the mind with guided meditation and pranayama. Reduce stress, sharpen focus, and sleep better in just 15 minutes a day.",
    category: "Wellness",
    createdBy: "Sara Iyer",
    duration: 3,
    price: 0,
    image: "uploads/course-3.jpg",
  },
];

async function run() {
  await connectDB(process.env.MONGO_URI);

  // Fresh start.
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Lecture.deleteMany({}),
    Progress.deleteMany({}),
  ]);

  // Admin account.
  const admin = new User({ name: "Admin", email: "admin@yogabliss.com", role: "admin" });
  await admin.setPassword("admin123");
  await admin.save();

  // Demo learner account.
  const learner = new User({ name: "Riddhi", email: "demo@yogabliss.com" });
  await learner.setPassword("demo123");
  await learner.save();

  // Upload the shared sample video once and reuse it across lectures.
  const sampleVideo = await seedAsset("uploads/sample-lecture.mp4");

  // Courses + one sample video lecture each.
  for (const data of COURSES) {
    const cover = await seedAsset(data.image);
    const course = await Course.create({ ...data, image: cover.url, imageId: cover.publicId });
    await Lecture.insertMany([
      {
        title: "Welcome & Introduction",
        description: "What this course covers and how to get the most from it.",
        video: sampleVideo.url,
        videoId: sampleVideo.publicId,
        course: course._id,
      },
      {
        title: "Your First Session",
        description: "Follow along with a full guided session.",
        video: sampleVideo.url,
        videoId: sampleVideo.publicId,
        course: course._id,
      },
    ]);
  }

  console.log("Seeded:");
  console.log("  admin   -> admin@yogabliss.com / admin123");
  console.log("  learner -> demo@yogabliss.com  / demo123");
  console.log(`  ${COURSES.length} courses with sample lectures`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
