import { Router } from "express";
import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import Progress from "../models/Progress.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { availableCourse, enrolled, enroll, completeLecture, progressPayload } from "../services/progress.js";
import { assertId } from "../utils/httpError.js";

import { orderedLessons } from "../services/lessonOrder.js";

const router = Router();
router.param("id", (req, res, next, id) => {
  try { assertId(id, "course ID"); next(); } catch (error) { next(error); }
});

// Is this user enrolled in (or an admin for) this course?
function hasAccess(user, courseId) {
  return user.role === "admin" || enrolled(user, courseId);
}

// GET /api/courses — public list of all courses.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const courses = await Course.find({ deleting: { $ne: true } }).sort({ createdAt: -1 });
    res.json({ courses });
  })
);

// GET /api/courses/mine — courses the logged-in user is enrolled in.
router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const courses = await Course.find({ _id: { $in: req.user.subscription }, deleting: { $ne: true } });
    res.json({ courses });
  })
);

// GET /api/courses/mine/progress — progress for every enrolled course, in one call.
// Powers the Account page bars and the "continue watching" banner.
router.get(
  "/mine/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const courseIds = req.user.subscription;
    const [progresses, lectures, courses] = await Promise.all([
      Progress.find({ user: req.user._id, course: { $in: courseIds } }),
      Lecture.find({ course: { $in: courseIds }, deleting: { $ne: true } }).select("_id course"),
      Course.find({ _id: { $in: courseIds }, deleting: { $ne: true } }).select("_id"),
    ]);
    const records = new Map(progresses.map((p) => [String(p.course), p]));
    const curricula = new Map();
    for (const lecture of lectures) {
      const key = String(lecture.course);
      if (!curricula.has(key)) curricula.set(key, []);
      curricula.get(key).push(lecture);
    }
    const progress = {};
    for (const course of courses) {
      const key = String(course._id);
      const { completedLectures, ...summary } = progressPayload(records.get(key), curricula.get(key) || []);
      progress[key] = summary;
    }
    res.json({ progress });
  })
);

// GET /api/courses/:id — single course details.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const course = await availableCourse(req.params.id);
    // Public curriculum metadata only; lesson text/video stays enrollment-gated.
    const lessons = await orderedLessons(course);
    const curriculum = lessons.map((lesson) => ({
      id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      durationMinutes: lesson.durationMinutes,
      hasVideo: Boolean(lesson.video),
    }));
    res.json({ course, curriculum });
  })
);

// POST /api/courses/:id/enroll — free enrollment (no payment).
// The original app charged via Razorpay here; we keep it free so it runs anywhere.
router.post(
  "/:id/enroll",
  requireAuth,
  asyncHandler(async (req, res) => {
    const course = await enroll(req.user, req.params.id);

    res.json({ message: "Enrolled successfully", course });
  })
);

// GET /api/courses/:id/lectures — lecture list (enrolled users / admins only).
router.get(
  "/:id/lectures",
  requireAuth,
  asyncHandler(async (req, res) => {
    const course = await availableCourse(req.params.id);
    if (!hasAccess(req.user, req.params.id)) {
      return res.status(403).json({ error: "Enroll in this course to watch lectures" });
    }
    const lectures = await orderedLessons(course);
    res.json({ lectures });
  })
);

// POST /api/courses/:id/progress — mark a lecture as completed.
// Returns the updated progress so the client doesn't need a second request.
router.post(
  "/:id/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = await completeLecture(req.user, req.params.id, req.body?.lectureId);
    res.json({ message: "Progress saved", ...payload });
  })
);

// GET /api/courses/:id/progress — percentage completed.
router.get(
  "/:id/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    await availableCourse(req.params.id);
    if (!hasAccess(req.user, req.params.id)) {
      return res.status(403).json({ error: "Enroll in this course first" });
    }
    const [progress, lectures] = await Promise.all([
      Progress.findOne({ user: req.user._id, course: req.params.id }),
      Lecture.find({ course: req.params.id, deleting: { $ne: true } }).select("_id"),
    ]);
    res.json(progressPayload(progress, lectures));
  })
);

export default router;
