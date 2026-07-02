import { Router } from "express";
import { rm } from "fs/promises";
import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import User from "../models/User.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { uploadFile, storeUpload } from "../middleware/upload.js";
import { cloudinaryEnabled, destroyAsset } from "../config/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Remove a stored asset: from Cloudinary (by public_id) in prod, or from disk in dev.
async function removeAsset(url, publicId, resourceType = "image") {
  if (cloudinaryEnabled) {
    await destroyAsset(publicId, resourceType);
  } else if (url) {
    await rm(url).catch(() => {}); // url is the local "uploads/<name>" path in dev
  }
}

const router = Router();

// Every admin route needs a logged-in admin.
router.use(requireAuth, requireAdmin);

// POST /api/admin/courses — create a course. Cover image comes as form field "file".
router.post(
  "/courses",
  uploadFile,
  storeUpload,
  asyncHandler(async (req, res) => {
    const { title, description, category, createdBy, duration, price } = req.body;
    if (!req.uploaded) return res.status(400).json({ error: "Cover image is required" });

    const course = await Course.create({
      title,
      description,
      category,
      createdBy,
      duration,
      price,
      image: req.uploaded.url, // Cloudinary URL (prod) or "uploads/<uuid>.jpg" (dev)
      imageId: req.uploaded.publicId,
    });
    res.status(201).json({ message: "Course created", course });
  })
);

// POST /api/admin/courses/:id/lectures — add a video lecture (video as field "file").
router.post(
  "/courses/:id/lectures",
  uploadFile,
  storeUpload,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    if (!req.uploaded) return res.status(400).json({ error: "Video file is required" });

    const lecture = await Lecture.create({
      title: req.body.title,
      description: req.body.description || "",
      video: req.uploaded.url,
      videoId: req.uploaded.publicId,
      course: course._id,
    });
    res.status(201).json({ message: "Lecture added", lecture });
  })
);

// DELETE /api/admin/lectures/:id
router.delete(
  "/lectures/:id",
  asyncHandler(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });
    await removeAsset(lecture.video, lecture.videoId, "video");
    await lecture.deleteOne();
    res.json({ message: "Lecture deleted" });
  })
);

// DELETE /api/admin/courses/:id — removes the course, its lectures, and enrollments.
router.delete(
  "/courses/:id",
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const lectures = await Lecture.find({ course: course._id });
    await Promise.all(lectures.map((l) => removeAsset(l.video, l.videoId, "video")));
    await removeAsset(course.image, course.imageId, "image");

    await Lecture.deleteMany({ course: course._id });
    await course.deleteOne();
    await User.updateMany({}, { $pull: { subscription: course._id } });

    res.json({ message: "Course deleted" });
  })
);

// GET /api/admin/stats — counts for the admin dashboard.
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [totalCourses, totalLectures, totalUsers] = await Promise.all([
      Course.countDocuments(),
      Lecture.countDocuments(),
      User.countDocuments(),
    ]);
    res.json({ stats: { totalCourses, totalLectures, totalUsers } });
  })
);

// GET /api/admin/users — everyone except the current admin.
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-passwordHash");
    res.json({ users });
  })
);

export default router;
