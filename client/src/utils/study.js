// Use current lesson IDs for the display; leave persistence/integrity changes to a later phase.
export function studySummary(lessons, completedLectures = []) {
  const ids = new Set(completedLectures);
  const completed = lessons.filter((lesson) => ids.has(lesson._id)).length;
  return {
    completed,
    total: lessons.length,
    complete: lessons.length > 0 && completed === lessons.length,
    firstUnfinished: lessons.find((lesson) => !ids.has(lesson._id))?._id || null,
  };
}
