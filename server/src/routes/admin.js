import { Router } from "express";
import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import User from "../models/User.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { uploadFor } from "../middleware/upload.js";
import { availableCourse } from "../services/progress.js";
import { deleteCourse, deleteLecture } from "../services/deletion.js";
import { saveAdminDocument } from "../services/adminMedia.js";
import { courseFields, lessonFields } from "../services/adminValidation.js";
import { orderedLessons, setLessonOrder, positionLesson } from "../services/lessonOrder.js";
import { assertId, httpError } from "../utils/httpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth, requireAdmin);
router.param("id", (req, res, next, id) => {
  try { assertId(id); next(); } catch (error) { next(error); }
});
const loadCourse = asyncHandler(async (req, res, next) => { req.course = await availableCourse(req.params.id); next(); });
const loadLecture = asyncHandler(async (req, res, next) => {
  req.lecture = await Lecture.findById(req.params.id);
  if (!req.lecture) throw httpError(404, "Lesson not found");
  if (req.lecture.deleting) throw httpError(409, "Lesson is being removed");
  req.course = await availableCourse(req.lecture.course);
  next();
});

router.get("/courses", asyncHandler(async (req, res) => {
  // Include interrupted deletions so the admin can retry cleanup.
  const [courses, lectures] = await Promise.all([Course.find().sort({ createdAt: -1 }), Lecture.find().select("course")]);
  const counts = new Map();
  for (const lesson of lectures) counts.set(String(lesson.course), (counts.get(String(lesson.course)) || 0) + 1);
  res.json({ courses: courses.map((course) => ({ ...course.toObject(), lessonCount: counts.get(String(course._id)) || 0 })) });
}));

router.post("/courses", uploadFor("image"), asyncHandler(async (req, res) => {
  const fields = courseFields(req.body);
  const result = await saveAdminDocument(new Course({ image: "pending-upload" }), fields, req.file, "image");
  res.status(201).json({ message: "Course created", course: result.saved });
}));
router.put("/courses/:id", loadCourse, uploadFor("image"), asyncHandler(async (req, res) => {
  const fields = courseFields(req.body, req.course);
  const { saved, warning } = await saveAdminDocument(req.course, fields, req.file, "image");
  res.json({ message: "Course updated", course: saved, warning });
}));
router.delete("/courses/:id", asyncHandler(async (req, res) => {
  await deleteCourse(req.params.id);
  res.json({ message: "Course deleted" });
}));

router.get("/courses/:id/lectures", loadCourse, asyncHandler(async (req, res) => {
  const lessons = await orderedLessons(req.course, true);
  let position = 0;
  res.json({ course: req.course, lectures: lessons.map((lesson) => ({ ...lesson.toObject(), order: lesson.deleting ? null : ++position })) });
}));
router.put("/courses/:id/lectures/order", loadCourse, asyncHandler(async (req, res) => {
  await setLessonOrder(req.course, req.body?.lessonIds);
  res.json({ message: "Lesson order saved" });
}));

async function saveLesson(req, res) {
  const course = await availableCourse(req.course._id);
  const lessons = await orderedLessons(course);
  const { position, type, ...fields } = lessonFields(req.body, req.lecture, lessons.length);
  if (type === "written" && req.file) throw httpError(422, "Written lessons do not accept video uploads");
  const document = req.lecture || new Lecture({ course: course._id });
  const { saved, warning: mediaWarning } = await saveAdminDocument(document, fields, req.file, "video");
  const current = await Course.findById(course._id);
  if (!current || current.deleting) {
    await deleteLecture(saved._id);
    throw httpError(409, "Course is no longer available");
  }
  let warning = mediaWarning;
  try { await positionLesson(course._id, saved._id, position); }
  catch {
    // Content has committed: do not report a failed create and invite duplicates.
    warning = [warning, "Lesson saved, but its position could not be saved. Reload and use Move Up/Down to retry."].filter(Boolean).join(" ");
  }
  res.status(req.lecture ? 200 : 201).json({ message: req.lecture ? "Lesson updated" : "Lesson created", lecture: saved, warning });
}
router.post("/courses/:id/lectures", loadCourse, uploadFor("video"), asyncHandler(saveLesson));
router.put("/lectures/:id", loadLecture, uploadFor("video"), asyncHandler(saveLesson));
router.delete("/lectures/:id", asyncHandler(async (req, res) => {
  await deleteLecture(req.params.id);
  res.json({ message: "Lesson deleted" });
}));

router.get("/stats", asyncHandler(async (req, res) => {
  const [totalCourses, totalLectures, totalUsers] = await Promise.all([Course.countDocuments(), Lecture.countDocuments(), User.countDocuments()]);
  res.json({ stats: { totalCourses, totalLectures, totalUsers } });
}));
router.get("/users", asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("-passwordHash");
  res.json({ users });
}));
export default router;
