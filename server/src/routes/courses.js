import { Router } from "express";
import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import Progress from "../models/Progress.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Is this user enrolled in (or an admin for) this course?
function hasAccess(user, courseId) {
  return user.role === "admin" || user.subscription.some((id) => id.equals(courseId));
}

// GET /api/courses — public list of all courses.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json({ courses });
  })
);

// GET /api/courses/mine — courses the logged-in user is enrolled in.
router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const courses = await Course.find({ _id: { $in: req.user.subscription } });
    res.json({ courses });
  })
);

// GET /api/courses/:id — single course details.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json({ course });
  })
);

// POST /api/courses/:id/enroll — free enrollment (no payment).
// The original app charged via Razorpay here; we keep it free so it runs anywhere.
router.post(
  "/:id/enroll",
  requireAuth,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    if (req.user.subscription.some((id) => id.equals(course._id))) {
      return res.status(400).json({ error: "You are already enrolled" });
    }

    req.user.subscription.push(course._id);
    await req.user.save();

    // Start a progress record so the dashboard has something to show.
    await Progress.create({ user: req.user._id, course: course._id, completedLectures: [] });

    res.json({ message: "Enrolled successfully", course });
  })
);

// GET /api/courses/:id/lectures — lecture list (enrolled users / admins only).
router.get(
  "/:id/lectures",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!hasAccess(req.user, req.params.id)) {
      return res.status(403).json({ error: "Enroll in this course to watch lectures" });
    }
    const lectures = await Lecture.find({ course: req.params.id }).sort({ createdAt: 1 });
    res.json({ lectures });
  })
);

// POST /api/courses/:id/progress — mark a lecture as completed.
router.post(
  "/:id/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { lectureId } = req.body;
    const progress = await Progress.findOne({ user: req.user._id, course: req.params.id });
    if (!progress) return res.status(404).json({ error: "No progress record — enroll first" });

    if (!progress.completedLectures.some((id) => id.equals(lectureId))) {
      progress.completedLectures.push(lectureId);
      await progress.save();
    }
    res.json({ message: "Progress saved" });
  })
);

// GET /api/courses/:id/progress — percentage completed.
router.get(
  "/:id/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const progress = await Progress.findOne({ user: req.user._id, course: req.params.id });
    const total = await Lecture.countDocuments({ course: req.params.id });
    const completed = progress ? progress.completedLectures.length : 0;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    res.json({
      percentage,
      completed,
      total,
      completedLectures: progress ? progress.completedLectures : [],
    });
  })
);

export default router;
