import { clone, hash, id, ObjectId, OLD_LESSONS, oldCourseFields, keyOf } from "../../scripts/migration/core.js";
import { COURSES } from "../../src/seed/catalog.js";

const oid = (n) => new ObjectId(n.toString(16).padStart(24, "0"));
export function migrationFixture() {
  const at = new Date("2024-01-01T00:00:00.000Z");
  const courses = COURSES.map((_, i) => ({ _id: oid(i + 1), ...oldCourseFields(i), image: `https://res.cloudinary.com/fixture/image/upload/old-cover-${i}.jpg`, imageId: `old-cover-${i}`, createdAt: at, updatedAt: at, __v: 0 }));
  const lectures = courses.flatMap((c, i) => OLD_LESSONS.map((lesson, j) => ({ _id: oid(10 + i * 2 + j), ...lesson, course: c._id, video: "https://res.cloudinary.com/fixture/video/upload/shared-old-demo.mp4", videoId: "shared-old-demo", __v: 0, createdAt: at, updatedAt: at })));
  courses.push({ _id: oid(99), title: "Unrelated custom course", image: "unrelated.jpg" });
  lectures.push({ _id: oid(98), course: oid(99), title: "Unrelated lesson", content: "Keep this", createdAt: at });
  const users = [
    { _id: oid(100), role: "admin", email: "admin@example.test", passwordHash: "private-fixture-value", subscription: [] },
    { _id: oid(101), role: "user", email: "learner@example.test", passwordHash: "private-fixture-value", subscription: [oid(1), oid(2), oid(3), oid(99)] },
    { _id: oid(102), role: "user", email: "another@example.test", passwordHash: "private-fixture-value", subscription: [oid(1)] },
  ];
  const progresses = [
    { _id: oid(201), user: oid(101), course: oid(1), completedLectures: [oid(10), oid(11)], createdAt: at, updatedAt: at },
    { _id: oid(202), user: oid(101), course: oid(2), completedLectures: [oid(12)], createdAt: at, updatedAt: at },
    { _id: oid(203), user: oid(101), course: oid(3), completedLectures: [], createdAt: at, updatedAt: at },
    { _id: oid(204), user: oid(102), course: oid(1), completedLectures: [oid(10)], createdAt: at, updatedAt: at },
    { _id: oid(205), user: oid(101), course: oid(99), completedLectures: [oid(98)], createdAt: at, updatedAt: at },
  ];
  const mapping = COURSES.map((c, i) => ({ target: keyOf(c), courseId: id(oid(i + 1)), oldLectureIds: [id(oid(10 + i * 2)), id(oid(11 + i * 2))], reviewed: true, oldMediaReviewed: true }));
  const checksums = Object.fromEntries(COURSES.map((c) => [keyOf(c), hash(c.image)]));
  const covers = Object.fromEntries(COURSES.map((c) => [keyOf(c), { url: `https://res.cloudinary.com/fixture/image/upload/new-${keyOf(c)}.jpg`, publicId: `new-${keyOf(c)}`, verified: true, sourceChecksum: checksums[keyOf(c)], verifiedAt: at.toISOString() }]));
  return { snapshot: { identity: { database: "isolated_fixture", deploymentFingerprint: hash("fixture-only-no-network") }, courses, lectures, progresses, users, journals: [], indexes: { courses: [{ name: "_id_", key: { _id: 1 } }], lectures: [], users: [], progresses: [{ name: "user_1_course_1", key: { user: 1, course: 1 }, unique: true }] } }, mapping, checksums, covers };
}

// Atomic fixture transaction: mutations are committed only after every check succeeds.
// This is NOT proof of MongoDB server transaction behavior; no network is used.
export function fixtureAdapter(initial, failAfter = Infinity) {
  let state = clone(initial);
  let operations = 0;
  return {
    read: async () => clone(state),
    async transaction(work) {
      const working = clone(state);
      const tick = () => { if (++operations >= failAfter) throw new Error("Injected storage failure"); };
      const result = await work({
        read: async () => clone(working),
        replace: async (table, rows) => { tick(); for (const row of rows) { const i = working[table].findIndex((r) => id(r._id) === id(row._id)); if (i < 0) throw new Error("Missing fixture row"); working[table][i] = clone(row); } },
        insert: async (table, rows) => { tick(); for (const row of rows) { if (working[table].some((r) => id(r._id) === id(row._id))) throw new Error("Duplicate fixture row"); working[table].push(clone(row)); } },
        remove: async (table, ids) => { tick(); working[table] = working[table].filter((r) => !ids.includes(id(r._id))); },
        journal: async (row) => { tick(); working.journals = working.journals.filter((j) => j._id !== row._id); working.journals.push(clone(row)); },
      });
      state = working;
      return result;
    },
  };
}
