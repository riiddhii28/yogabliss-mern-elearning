import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import Progress from "../models/Progress.js";
import User from "../models/User.js";
import { assertId, httpError } from "../utils/httpError.js";

export async function availableCourse(id) {
  assertId(String(id), "course ID");
  const course = await Course.findById(id);
  if (!course) throw httpError(404, "Course not found");
  if (course.deleting) throw httpError(409, "Course is being removed");
  return course;
}

export function enrolled(user, courseId) {
  return user.subscription.some((id) => String(id) === String(courseId));
}

// Intersect completions with the current curriculum, deduplicating old references.
export function progressPayload(record, lectures) {
  const saved = new Set((record?.completedLectures || []).map(String));
  const completedLectures = [...new Set(lectures.map((lecture) => String(lecture._id)))]
    .filter((id) => saved.has(id));
  const total = new Set(lectures.map((lecture) => String(lecture._id))).size;
  const completed = completedLectures.length;
  return { percentage: total ? Math.round(completed / total * 100) : 0, completed, total, completedLectures };
}

// The existing unique (user, course) index arbitrates concurrent upserts.
export async function updateProgress(user, course, update) {
  const filter = { user, course };
  const options = { new: true, runValidators: true };
  try {
    return await Progress.findOneAndUpdate(filter, update, { ...options, upsert: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const record = await Progress.findOneAndUpdate(filter, update, options);
    if (!record) throw error;
    return record;
  }
}

export async function enroll(user, courseId) {
  const course = await availableCourse(courseId);
  // Prepare progress first. If adding subscription fails, retry reuses this row.
  // If subscription already exists but progress is missing, this repairs it.
  await updateProgress(user._id, course._id, { $setOnInsert: { completedLectures: [] } });
  const result = await User.updateOne({ _id: user._id }, { $addToSet: { subscription: course._id } });
  if (!result.matchedCount) {
    await Progress.deleteOne({ user: user._id, course: course._id });
    throw httpError(401, "User no longer exists");
  }
  // Reconcile a deletion that began while enrollment was in flight.
  const current = await Course.findById(course._id);
  if (!current || current.deleting) {
    await User.updateOne({ _id: user._id }, { $pull: { subscription: course._id } });
    await Progress.deleteOne({ user: user._id, course: course._id });
    throw httpError(409, "Course is no longer available");
  }
  return course;
}

export async function completeLecture(user, courseId, lectureId) {
  assertId(lectureId, "lecture ID");
  const course = await availableCourse(courseId);
  if (!enrolled(user, course._id)) throw httpError(403, "Enroll in this course first");
  const lecture = await Lecture.findOne({ _id: lectureId, course: course._id, deleting: { $ne: true } });
  if (!lecture) throw httpError(404, "Lecture not found in this course");
  const progress = await updateProgress(user._id, course._id, { $addToSet: { completedLectures: lecture._id } });
  const [currentCourse, currentLecture, lectures] = await Promise.all([
    Course.findById(course._id),
    Lecture.findOne({ _id: lectureId, course: course._id, deleting: { $ne: true } }),
    Lecture.find({ course: course._id, deleting: { $ne: true } }).select("_id"),
  ]);
  if (!currentCourse || currentCourse.deleting) {
    await Progress.deleteOne({ user: user._id, course: course._id });
    throw httpError(409, "Course is no longer available");
  }
  if (!currentLecture) {
    await Progress.updateOne({ user: user._id, course: course._id }, { $pull: { completedLectures: lecture._id } });
    throw httpError(409, "Lecture is no longer available");
  }
  return progressPayload(progress, lectures);
}
