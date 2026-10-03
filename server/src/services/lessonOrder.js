import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import { httpError, assertId } from "../utils/httpError.js";

export function orderLessons(course, lessons) {
  const rank = new Map((course.lessonOrder || []).map((id, i) => [String(id), i]));
  return [...lessons].sort((a, b) => {
    const difference = (rank.get(String(a._id)) ?? Infinity) - (rank.get(String(b._id)) ?? Infinity);
    return (Number.isNaN(difference) ? 0 : difference) ||
      (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) || String(a._id).localeCompare(String(b._id));
  });
}

export async function orderedLessons(course, includeDeleting = false) {
  const filter = { course: course._id, ...(!includeDeleting && { deleting: { $ne: true } }) };
  return orderLessons(course, await Lecture.find(filter));
}

export function versionFilter(document) {
  return document.__v == null ? { __v: { $exists: false } } : { __v: document.__v };
}

// One atomic course update stores the entire order; no partially swapped rows.
export async function setLessonOrder(course, ids) {
  if (!Array.isArray(ids)) throw httpError(422, "Lesson order must be an array");
  ids.forEach((id) => assertId(id, "lesson ID"));
  const lessons = await Lecture.find({ course: course._id, deleting: { $ne: true } }).select("_id");
  const valid = new Set(lessons.map((lesson) => String(lesson._id)));
  if (ids.length !== valid.size || new Set(ids).size !== ids.length || ids.some((id) => !valid.has(id))) {
    throw httpError(409, "Lessons have changed. Reload the lesson list and try again.");
  }
  const updated = await Course.findOneAndUpdate(
    { _id: course._id, deleting: { $ne: true }, ...versionFilter(course) },
    { $set: { lessonOrder: ids }, $inc: { __v: 1 } }, { new: true }
  );
  if (!updated) throw httpError(409, "Course changed. Reload and try again.");
  return updated;
}

export async function positionLesson(courseId, lessonId, position) {
  const course = await Course.findById(courseId);
  if (!course || course.deleting) throw httpError(409, "Course is no longer available");
  const lessons = await orderedLessons(course);
  const ids = lessons.map((lesson) => String(lesson._id)).filter((id) => id !== String(lessonId));
  ids.splice(Math.min(position - 1, ids.length), 0, String(lessonId));
  await setLessonOrder(course, ids);
}
