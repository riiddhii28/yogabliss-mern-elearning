// Keep older week-based records readable while short demo courses use minutes.
export function courseDuration(course) {
  if (course.durationUnit === "minutes") return `About ${course.duration} min`;
  return `${course.duration} ${course.duration === 1 ? "week" : "weeks"}`;
}
