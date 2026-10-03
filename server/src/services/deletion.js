import Course from "../models/Course.js";
import Lecture from "../models/Lecture.js";
import User from "../models/User.js";
import Progress from "../models/Progress.js";
import { assertId, httpError } from "../utils/httpError.js";
import { removeUnusedMedia, courseMedia, lectureMedia } from "./media.js";

export async function deleteLecture(id) {
  assertId(String(id), "lecture ID");
  const lecture = await Lecture.findOneAndUpdate({ _id: id }, { $set: { deleting: true } }, { new: true });
  if (!lecture) throw httpError(404, "Lecture not found");
  // Remove even old corrupt cross-course completion references.
  await Progress.updateMany({ completedLectures: lecture._id }, { $pull: { completedLectures: lecture._id } });
  await removeUnusedMedia(lectureMedia(lecture), { lecture: lecture._id });
  // Keep the record/public ID until cleanup succeeds, so failure is retryable.
  await Course.updateOne({ _id: lecture.course }, { $pull: { lessonOrder: lecture._id }, $inc: { __v: 1 } });
  await Lecture.deleteOne({ _id: lecture._id });
}

export async function deleteCourse(id) {
  assertId(String(id), "course ID");
  const course = await Course.findOneAndUpdate({ _id: id }, { $set: { deleting: true } }, { new: true });
  if (!course) throw httpError(404, "Course not found");
  const lectures = await Lecture.find({ course: course._id }).select("_id");
  // Sequential cleanup bounds provider calls and handles shared course videos.
  for (const lecture of lectures) {
    try { await deleteLecture(lecture._id); }
    catch (error) { if (error.status !== 404) throw error; }
  }
  await Progress.deleteMany({ course: course._id });
  await User.updateMany({ subscription: course._id }, { $pull: { subscription: course._id } });
  await removeUnusedMedia(courseMedia(course), { course: course._id });
  await Course.deleteOne({ _id: course._id });
}
