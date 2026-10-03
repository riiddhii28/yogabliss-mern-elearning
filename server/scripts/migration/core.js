// Pure migration planning. No application startup, model initialization or seed imports.
import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { COURSES } from "../../src/seed/catalog.js";

export const { EJSON } = mongoose.mongo.BSON;
export const { ObjectId } = mongoose.mongo;
export const VERSION = "yogabliss-written-catalog-v1";
export const TABLES = ["courses", "lectures", "progresses", "users"];
export const keyOf = (course) => course.image.split("/").at(-1).replace(/\.jpg$/, "");
export const id = (value) => String(value);
export const clone = (value) => mongoose.mongo.BSON.deserialize(mongoose.mongo.BSON.serialize({ value }), { promoteLongs: false }).value;
export const decode = (text) => clone(EJSON.parse(text, { relaxed: false }));
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  return value;
}
export const hash = (value) => createHash("sha256").update(JSON.stringify(sorted(EJSON.serialize(value === undefined ? { $undefined: true } : value, { relaxed: false })))).digest("hex");
export function fail(code) { throw Object.assign(new Error(code), { migrationCode: code }); }
export function check(condition, code) { if (!condition) fail(code); }
const isId = (value) => typeof value === "string" && /^[a-f0-9]{24}$/.test(value);
const unique = (values) => new Set(values).size === values.length;
const rowsHash = (rows) => hash([...rows].sort((a, b) => id(a._id).localeCompare(id(b._id))));
export function snapshotHash(snapshot) {
  return hash({ identity: snapshot.identity, indexes: snapshot.indexes,
    tables: Object.fromEntries(TABLES.map((table) => [table, rowsHash(snapshot[table])])) });
}
export const catalogChecksum = () => hash(COURSES);
export const sourceChecksums = (buffers) => Object.fromEntries(COURSES.map((course, i) => [keyOf(course), createHash("sha256").update(buffers[i]).digest("hex")]));

const OLD = [
  { category: "Beginner", createdBy: "Ananya Rao", duration: 4, price: 499, description: "Build a strong base with classic Hatha postures, breathing, and alignment. Perfect for beginners starting their journey to inner calm." },
  { category: "Intermediate", createdBy: "Ravi Menon", duration: 6, price: 899, description: "Link breath to movement in dynamic flows that build heat, flexibility, and full-body strength. Best for those with some yoga experience." },
  { category: "Wellness", createdBy: "Sara Iyer", duration: 3, price: 0, description: "Calm the mind with guided meditation and pranayama. Reduce stress, sharpen focus, and sleep better in just 15 minutes a day." },
];
export const oldCourseFields = (index) => ({ title: COURSES[index].title, ...OLD[index] });
export const OLD_LESSONS = [
  { title: "Welcome & Introduction", description: "What this course covers and how to get the most from it." },
  { title: "Your First Session", description: "Follow along with a full guided session." },
];
const COURSE_KEYS = new Set(["_id", "__v", "createdAt", "updatedAt", "title", "description", "category", "createdBy", "duration", "price", "image", "imageId", "durationUnit", "level", "learningOutcomes", "lessonOrder", "deleting"]);
const LESSON_KEYS = new Set(["_id", "__v", "createdAt", "updatedAt", "title", "description", "video", "videoId", "course", "content", "durationMinutes", "deleting"]);

export function validateMapping(mapping) {
  check(Array.isArray(mapping) && mapping.length === 3, "MAPPING_COUNT");
  check(mapping.every((m) => isId(m.courseId) && m.reviewed === true && m.oldMediaReviewed === true &&
    COURSES.some((c) => keyOf(c) === m.target) && Array.isArray(m.oldLectureIds) && m.oldLectureIds.length === 2 && m.oldLectureIds.every(isId)), "MAPPING_INVALID_OR_UNREVIEWED");
  check(unique(mapping.map((m) => m.courseId)) && unique(mapping.map((m) => m.target)) && unique(mapping.flatMap((m) => m.oldLectureIds)), "MAPPING_DUPLICATE");
}
function scope(snapshot, mapping) {
  const ids = new Set(mapping.map((m) => m.courseId));
  const progresses = snapshot.progresses.filter((p) => ids.has(id(p.course)));
  const userIds = new Set(progresses.map((p) => id(p.user)));
  return {
    courses: snapshot.courses.filter((c) => ids.has(id(c._id))),
    lectures: snapshot.lectures.filter((l) => ids.has(id(l.course))),
    progresses,
    users: snapshot.users.filter((u) => userIds.has(id(u._id)) || (u.subscription || []).some((c) => ids.has(id(c)))),
  };
}
function validateRelationships(snapshot, mapping) {
  const courseIds = new Set(mapping.map((m) => m.courseId));
  const retired = new Set(mapping.flatMap((m) => m.oldLectureIds));
  const users = new Map(snapshot.users.map((u) => [id(u._id), u]));
  const lessons = new Map(snapshot.lectures.map((l) => [id(l._id), l]));
  const affected = snapshot.progresses.filter((p) => courseIds.has(id(p.course)) || (p.completedLectures || []).some((l) => retired.has(id(l))));
  check(unique(affected.map((p) => `${p.user}:${p.course}`)), "DUPLICATE_PROGRESS");
  for (const p of affected) {
    const user = users.get(id(p.user));
    check(user && courseIds.has(id(p.course)) && (user.subscription || []).some((c) => id(c) === id(p.course)), "INVALID_PROGRESS_RELATIONSHIP");
    check(Array.isArray(p.completedLectures) && p.completedLectures.every((l) => id(lessons.get(id(l))?.course) === id(p.course)), "CROSS_COURSE_COMPLETION");
  }
  for (const user of snapshot.users) {
    const subscriptions = (user.subscription || []).filter((c) => courseIds.has(id(c))).map(id);
    check(unique(subscriptions), "DUPLICATE_ENROLLMENT");
  }
  // MongoDB enforces this in normal concurrent enrollment/progress upserts.
  check((snapshot.indexes.progresses || []).some((i) => i.unique === true && hash(i.key) === hash({ user: 1, course: 1 }) && !i.partialFilterExpression && !i.sparse), "PROGRESS_INDEX_MISSING");
}
function validateOld(snapshot, mapping) {
  validateMapping(mapping);
  for (const m of mapping) {
    const i = COURSES.findIndex((c) => keyOf(c) === m.target);
    const matches = snapshot.courses.filter((c) => id(c._id) === m.courseId);
    check(matches.length === 1, "TARGET_COURSE_MISSING");
    const course = matches[0];
    check(Object.entries(oldCourseFields(i)).every(([k, v]) => course[k] === v) && Object.keys(course).every((k) => COURSE_KEYS.has(k)) &&
      !course.deleting && (!course.durationUnit || course.durationUnit === "weeks") && !course.level &&
      !(course.learningOutcomes || []).length && !(course.lessonOrder || []).length && typeof course.image === "string" && course.image.length > 0, "CUSTOM_COURSE_REQUIRES_REVIEW");
    const lessons = snapshot.lectures.filter((l) => id(l.course) === m.courseId);
    check(lessons.length === 2 && lessons.every((l) => m.oldLectureIds.includes(id(l._id))), "OLD_LESSON_SET_CHANGED");
    check(OLD_LESSONS.every((expected) => lessons.filter((l) => l.title === expected.title && l.description === expected.description).length === 1), "CUSTOM_LESSON_REQUIRES_REVIEW");
    check(lessons.every((l) => typeof l.video === "string" && l.video.length > 0 && !l.content && !l.deleting && l.durationMinutes == null && Object.keys(l).every((k) => LESSON_KEYS.has(k))), "CUSTOM_LESSON_REQUIRES_REVIEW");
  }
  const oldLessons = scope(snapshot, mapping).lectures;
  check(new Set(oldLessons.map((l) => `${l.video}|${l.videoId || ""}`)).size === 1, "OLD_MEDIA_NOT_SHARED_DEMO");
  validateRelationships(snapshot, mapping);
}

// Reports omit users, emails, password hashes and connection details.
export function inventory(snapshot) {
  return {
    identity: snapshot.identity, snapshotChecksum: snapshotHash(snapshot),
    counts: Object.fromEntries(TABLES.map((t) => [t, snapshot[t].length])),
    indexes: snapshot.indexes,
    candidates: COURSES.map((target) => ({ target: keyOf(target), courses: snapshot.courses.filter((c) => c.title === target.title).map((c) => ({
      courseId: id(c._id), title: c.title, checksum: hash(c),
      metadata: Object.fromEntries(["description", "category", "duration", "durationUnit", "price", "level", "createdBy", "learningOutcomes", "lessonOrder"].filter((k) => k in c).map((k) => [k, c[k]])),
      image: c.image, imageId: c.imageId || "",
      lessons: snapshot.lectures.filter((l) => id(l.course) === id(c._id)).map((l) => ({ id: id(l._id), title: l.title, description: l.description, durationMinutes: l.durationMinutes, video: l.video || "", videoId: l.videoId || "", hasWrittenContent: Boolean(l.content), checksum: hash(l) })),
      enrollments: snapshot.users.filter((u) => (u.subscription || []).some((v) => id(v) === id(c._id))).length,
      progressRecords: snapshot.progresses.filter((p) => id(p.course) === id(c._id)).length,
    })) })),
    unrelatedCourseIds: snapshot.courses.filter((c) => !COURSES.some((t) => t.title === c.title)).map((c) => id(c._id)),
    duplicateProgressPairs: snapshot.progresses.length - new Set(snapshot.progresses.map((p) => `${p.user}:${p.course}`)).size,
    invalidCompletionReferences: snapshot.progresses.reduce((n, p) => n + (p.completedLectures || []).filter((l) => !snapshot.lectures.some((lesson) => id(lesson._id) === id(l) && id(lesson.course) === id(p.course))).length, 0),
  };
}

export function prepare(snapshot, mapping, checksums, covers = {}) {
  validateOld(snapshot, mapping);
  check(!(snapshot.journals || []).length, "EXISTING_MIGRATION_JOURNAL");
  const now = new Date();
  const backup = clone({ version: VERSION, id: randomUUID(), identity: clone(snapshot.identity), createdAt: now,
    snapshotChecksum: snapshotHash(snapshot), data: clone(scope(snapshot, mapping)), indexes: clone(snapshot.indexes), inventory: inventory(snapshot) });
  const manifest = {
    version: VERSION, identity: clone(snapshot.identity), catalogChecksum: catalogChecksum(), snapshotChecksum: snapshotHash(snapshot),
    plannedAt: now.toISOString(), stage: "prepared", backup: { id: backup.id, checksum: hash(backup) },
    mapping: mapping.map((m) => {
      const c = snapshot.courses.find((c) => id(c._id) === m.courseId);
      const metadata = Object.fromEntries([...COURSE_KEYS].filter((k) => k in c).map((k) => [k, clone(c[k])]));
      return { target: m.target, courseId: m.courseId, oldLectureIds: [...m.oldLectureIds], reviewed: m.reviewed, oldMediaReviewed: m.oldMediaReviewed,
        newLessonIds: Array.from({ length: 3 }, () => id(new ObjectId())), oldCourseMetadata: metadata, oldCourseChecksum: hash(c),
        oldCover: { url: c.image, publicId: c.imageId || "" }, sourceChecksum: checksums[m.target], cover: covers[m.target] || null };
    }),
    affectedProgressIds: backup.data.progresses.map((p) => id(p._id)).sort(),
    affectedEnrollmentCounts: Object.fromEntries(mapping.map((m) => [m.courseId, snapshot.users.filter((u) => (u.subscription || []).some((c) => id(c) === m.courseId)).length])),
  };
  validateManifest(manifest);
  return { manifest: clone(manifest), backup: clone(backup) };
}
export function validateManifest(m) {
  check(m && m.version === VERSION && m.stage === "prepared" && m.catalogChecksum === catalogChecksum() && typeof m.identity?.database === "string" && /^[a-f0-9]{64}$/.test(m.identity?.deploymentFingerprint), "INVALID_MANIFEST");
  validateMapping(m.mapping);
  check(m.mapping.every((x) => Array.isArray(x.newLessonIds) && x.newLessonIds.length === 3 && x.newLessonIds.every(isId) && /^[a-f0-9]{64}$/.test(x.sourceChecksum)), "INVALID_MANIFEST");
  const all = m.mapping.flatMap((x) => [x.courseId, ...x.oldLectureIds, ...x.newLessonIds]);
  check(unique(all) && Number.isFinite(Date.parse(m.plannedAt)) && /^[a-f0-9]{64}$/.test(m.snapshotChecksum) && /^[a-f0-9]{64}$/.test(m.backup?.checksum) && typeof m.backup.id === "string" && Array.isArray(m.affectedProgressIds), "INVALID_MANIFEST");
}
export function verifyBackup(manifest, backup) {
  validateManifest(manifest);
  check(backup && backup.id === manifest.backup.id && hash(backup) === manifest.backup.checksum && backup.version === VERSION && hash(backup.identity) === hash(manifest.identity) && backup.snapshotChecksum === manifest.snapshotChecksum, "BACKUP_MISSING_OR_CORRUPT");
  check(TABLES.every((t) => Array.isArray(backup.data?.[t])), "BACKUP_MISSING_OR_CORRUPT");
  validateOld({ ...backup.data, identity: backup.identity, indexes: backup.indexes }, manifest.mapping);
  check(hash(backup.data.progresses.map((p) => id(p._id)).sort()) === hash(manifest.affectedProgressIds), "INVALID_MANIFEST");
  for (const m of manifest.mapping) {
    const c = backup.data.courses.find((c) => id(c._id) === m.courseId);
    check(hash(c) === m.oldCourseChecksum && hash(c) === hash(m.oldCourseMetadata) && hash({ url: c.image, publicId: c.imageId || "" }) === hash(m.oldCover), "INVALID_MANIFEST");
    check(backup.data.users.filter((u) => (u.subscription || []).some((v) => id(v) === m.courseId)).length === manifest.affectedEnrollmentCounts[m.courseId], "INVALID_MANIFEST");
  }
}
export function coverIssues(manifest, checksums) {
  const issues = [];
  const urls = new Set(); const ids = new Set();
  for (const m of manifest.mapping) {
    const c = m.cover;
    let url;
    try { url = new URL(c?.url); } catch { /* Report missing reference below. */ }
    const valid = c?.verified === true && c.sourceChecksum === m.sourceChecksum && checksums[m.target] === m.sourceChecksum &&
      typeof c.publicId === "string" && c.publicId.length > 0 && Number.isFinite(Date.parse(c.verifiedAt)) &&
      url?.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password && !url.search && !url.hash &&
      url.pathname.includes("/image/upload/") && url.pathname.includes(`/${c.publicId}.`) &&
      !manifest.mapping.some((old) => old.oldCover.url === c.url || old.oldCover.publicId === c.publicId);
    if (!valid || urls.has(c?.url) || ids.has(c?.publicId)) issues.push(`COVER_NOT_VERIFIED:${m.target}`);
    urls.add(c?.url); ids.add(c?.publicId);
  }
  return issues;
}
function targetData(manifest, backup) {
  const result = clone(backup.data);
  const retired = new Set(manifest.mapping.flatMap((m) => m.oldLectureIds));
  const timestamp = new Date(manifest.plannedAt);
  result.lectures = [];
  for (const m of manifest.mapping) {
    const { lessons, image: _image, ...fields } = COURSES.find((c) => keyOf(c) === m.target);
    const course = result.courses.find((c) => id(c._id) === m.courseId);
    Object.assign(course, clone(fields), { image: m.cover?.url || "UNVERIFIED_COVER", imageId: m.cover?.publicId || "", lessonOrder: m.newLessonIds.map((i) => new ObjectId(i)), deleting: false, updatedAt: timestamp, __v: (course.__v || 0) + 1 });
    lessons.forEach((lesson, i) => result.lectures.push({ _id: new ObjectId(m.newLessonIds[i]), ...clone(lesson), course: course._id, video: "", videoId: "", deleting: false, __v: 0, createdAt: timestamp, updatedAt: timestamp }));
  }
  for (const p of result.progresses) {
    const remaining = p.completedLectures.filter((l) => !retired.has(id(l)));
    if (remaining.length !== p.completedLectures.length) Object.assign(p, { completedLectures: remaining, updatedAt: timestamp });
  }
  return result;
}
function assertTarget(snapshot, target, manifest, allowActivity) {
  const current = scope(snapshot, manifest.mapping);
  check(rowsHash(current.courses) === rowsHash(target.courses) && rowsHash(current.lectures) === rowsHash(target.lectures), "PARTIAL_OR_CHANGED_MIGRATION");
  if (allowActivity) {
    validateRelationships(snapshot, manifest.mapping);
  } else {
    check(rowsHash(current.progresses) === rowsHash(target.progresses), "POST_MIGRATION_ACTIVITY");
    for (const before of target.users) {
      const after = snapshot.users.find((u) => id(u._id) === id(before._id));
      check(after && hash(after.subscription || []) === hash(before.subscription || []), "POST_MIGRATION_ACTIVITY");
    }
    const ids = new Set(manifest.mapping.map((m) => m.courseId));
    check(snapshot.users.filter((u) => (u.subscription || []).some((c) => ids.has(id(c)))).every((u) => target.users.some((old) => id(old._id) === id(u._id))), "POST_MIGRATION_ACTIVITY");
  }
}
export function plan(snapshot, manifest, backup, checksums) {
  verifyBackup(manifest, backup);
  check(hash(snapshot.identity) === hash(manifest.identity), "WRONG_DATABASE_IDENTITY");
  const journal = (snapshot.journals || []).find((j) => j._id === VERSION);
  const target = targetData(manifest, backup);
  if (journal) {
    check(journal.manifestChecksum === hash(manifest) && ["applied", "rolled-back"].includes(journal.status), "UNRECOGNIZED_MIGRATION");
    if (journal.status === "applied") {
      assertTarget(snapshot, target, manifest, true);
      return { status: "already-applied", target, blockers: [] };
    }
    check(snapshotHash(snapshot) === manifest.snapshotChecksum, "SNAPSHOT_CHANGED");
    return { status: "already-rolled-back", target, blockers: ["CREATE_NEW_REVIEWED_MANIFEST_BEFORE_REAPPLY"] };
  }
  check(!(snapshot.journals || []).length, "UNRECOGNIZED_MIGRATION");
  check(snapshotHash(snapshot) === manifest.snapshotChecksum, "SNAPSHOT_CHANGED");
  validateOld(snapshot, manifest.mapping);
  const newIds = new Set(manifest.mapping.flatMap((m) => m.newLessonIds));
  check(!snapshot.lectures.some((l) => newIds.has(id(l._id))), "NEW_LESSON_ID_COLLISION");
  return { status: "ready", target, blockers: coverIssues(manifest, checksums) };
}
export function dryRun(snapshot, manifest, backup, checksums) {
  const p = plan(snapshot, manifest, backup, checksums);
  const retired = new Set(manifest.mapping.flatMap((m) => m.oldLectureIds));
  return {
    status: p.status, database: snapshot.identity, manifestChecksum: hash(manifest), blockers: p.blockers,
    writesPerformed: 0, subscriptionsChanged: false,
    changes: p.status === "ready" ? manifest.mapping.map((m) => {
      const before = backup.data.courses.find((c) => id(c._id) === m.courseId);
      const after = p.target.courses.find((c) => id(c._id) === m.courseId);
      return { courseId: m.courseId, target: m.target, fields: Object.keys(after).filter((k) => hash(after[k]) !== hash(before[k])).map((field) => ({ field, before: before[field] ?? null, after: after[field] })), retireLessonIds: m.oldLectureIds, newLessons: p.target.lectures.filter((l) => id(l.course) === m.courseId).map((l) => ({ id: id(l._id), title: l.title, durationMinutes: l.durationMinutes, type: "written" })) };
    }) : [],
    progressRecords: manifest.affectedProgressIds.length,
    completionReferencesToRemove: p.status === "ready" ? backup.data.progresses.reduce((n, p) => n + p.completedLectures.filter((l) => retired.has(id(l))).length, 0) : 0,
    enrollments: manifest.affectedEnrollmentCounts,
  };
}

// Adapter transactions must discard ALL writes on error. There is no non-atomic fallback.
export async function execute(adapter, mode, manifest, backup, checksums, authorization) {
  check(["apply", "rollback"].includes(mode), "INVALID_MODE");
  verifyBackup(manifest, backup);
  check(authorization?.approve === hash(manifest) && authorization?.database === manifest.identity.database && authorization?.maintenance === true, "EXPLICIT_AUTHORIZATION_REQUIRED");
  return adapter.transaction(async (tx) => {
    const snapshot = await tx.read();
    check(hash(snapshot.identity) === hash(manifest.identity), "WRONG_DATABASE_IDENTITY");
    if (mode === "apply") {
      const p = plan(snapshot, manifest, backup, checksums);
      if (p.status === "already-applied") return { status: p.status, writes: 0 };
      check(p.status === "ready" && !p.blockers.length, "APPLY_PRECONDITIONS_FAILED");
      await tx.replace("courses", p.target.courses);
      await tx.insert("lectures", p.target.lectures);
      await tx.replace("progresses", p.target.progresses);
      await tx.remove("lectures", manifest.mapping.flatMap((m) => m.oldLectureIds));
      await tx.journal({ _id: VERSION, manifestChecksum: hash(manifest), backupChecksum: manifest.backup.checksum, status: "applied" });
      assertTarget(await tx.read(), p.target, manifest, false);
      return { status: "applied", courses: 3, createdLessons: 9, retiredLessons: 6 };
    }
    const journal = (snapshot.journals || []).find((j) => j._id === VERSION);
    check(journal?.manifestChecksum === hash(manifest), "UNRECOGNIZED_MIGRATION");
    if (journal.status === "rolled-back") return { status: "already-rolled-back", writes: 0 };
    check(journal.status === "applied", "UNRECOGNIZED_MIGRATION");
    assertTarget(snapshot, targetData(manifest, backup), manifest, false);
    check(!snapshot.lectures.some((l) => manifest.mapping.some((m) => m.oldLectureIds.includes(id(l._id)))), "OLD_LESSON_ID_COLLISION");
    const newIds = new Set(manifest.mapping.flatMap((m) => m.newLessonIds));
    check(!snapshot.progresses.some((p) => p.completedLectures.some((l) => newIds.has(id(l)))), "POST_MIGRATION_ACTIVITY");
    await tx.insert("lectures", backup.data.lectures);
    await tx.replace("courses", backup.data.courses);
    await tx.replace("progresses", backup.data.progresses);
    await tx.remove("lectures", [...newIds]);
    await tx.journal({ ...journal, status: "rolled-back" });
    const restored = scope(await tx.read(), manifest.mapping);
    check(["courses", "lectures", "progresses"].every((t) => rowsHash(restored[t]) === rowsHash(backup.data[t])), "ROLLBACK_VERIFICATION_FAILED");
    return { status: "rolled-back", restoredLessons: 6, removedLessons: 9 };
  });
}
