import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import mongoose from "mongoose";
import { clone, dryRun, execute, hash, id, inventory, prepare, snapshotHash, verifyBackup, VERSION } from "../scripts/migration/core.js";
import { identityFor } from "../scripts/migration/mongo.js";
import { PRIVATE_ROOT, readArtifact, writeArtifact } from "../scripts/migration/artifacts.js";
import { parseOptions } from "../scripts/migrate-catalog.js";
import { fixtureAdapter, migrationFixture } from "./support/migrationFixture.js";
import Course from "../src/models/Course.js";
import Lecture from "../src/models/Lecture.js";
import { progressPayload } from "../src/services/progress.js";

const setup = () => { const f = migrationFixture(); return { ...f, ...prepare(f.snapshot, f.mapping, f.checksums, f.covers) }; };
const authorization = (m) => ({ approve: hash(m), database: m.identity.database, maintenance: true });
const run = (adapter, f, mode = "apply") => execute(adapter, mode, f.manifest, f.backup, f.checksums, authorization(f.manifest));

test("migration: default CLI is dry-run; conflicting modes fail; no arguments do not connect", () => {
  assert.equal(parseOptions([]).mode, "dry-run");
  assert.throws(() => parseOptions(["--apply", "--dry-run"]), /CONFLICTING_MODES/);
  const result = spawnSync(process.execPath, ["scripts/migrate-catalog.js"], { cwd: new URL("../", import.meta.url), encoding: "utf8", env: { ...process.env, MONGO_URI: "mongodb://private-user:private-value@invalid.example.test/db" } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /MANIFEST_REQUIRED/);
  assert.doesNotMatch(result.stderr, /private-user|private-value|invalid.example/);
});
test("migration: inventory is redacted and reports unrelated course IDs", () => {
  const f = setup(); const report = inventory(f.snapshot);
  assert.equal(report.candidates.length, 3);
  assert.equal(report.unrelatedCourseIds.length, 1);
  assert.doesNotMatch(JSON.stringify(report), /passwordHash|private-fixture-value|@example.test/);
  assert.doesNotMatch(JSON.stringify(f.manifest), /passwordHash|private-fixture-value|@example.test/);
});
test("migration: dry run reports 3 changes, 9 creations, 6 retirements and zero writes", () => {
  const f = setup(); const before = hash(f.snapshot);
  const report = dryRun(f.snapshot, f.manifest, f.backup, f.checksums);
  assert.equal(report.status, "ready"); assert.deepEqual(report.blockers, []);
  assert.equal(report.changes.length, 3);
  assert.equal(report.changes.flatMap((c) => c.newLessons).length, 9);
  assert.equal(report.changes.flatMap((c) => c.retireLessonIds).length, 6);
  assert.equal(report.completionReferencesToRemove, 4);
  assert.equal(report.progressRecords, 4);
  assert.equal(report.writesPerformed, 0); assert.equal(report.subscriptionsChanged, false);
  assert.equal(hash(f.snapshot), before);
});
test("migration: isolated apply preserves IDs, users and enrollment; resets only replaced progress", async () => {
  const f = setup(); const adapter = fixtureAdapter(f.snapshot);
  assert.equal((await run(adapter, f)).status, "applied");
  const after = await adapter.read();
  assert.equal(hash(after.users), hash(f.snapshot.users));
  assert.equal(after.courses.length, 4); assert.equal(after.lectures.length, 10);
  assert.deepEqual(after.courses.map((c) => id(c._id)), f.snapshot.courses.map((c) => id(c._id)));
  for (const m of f.manifest.mapping) {
    const course = after.courses.find((c) => id(c._id) === m.courseId);
    assert.equal(course.price, 0); assert.equal(course.durationUnit, "minutes");
    assert.deepEqual(course.lessonOrder.map(id), m.newLessonIds);
    await new Course(course).validate();
    const lessons = after.lectures.filter((l) => id(l.course) === m.courseId);
    assert.equal(lessons.length, 3);
    assert.equal(lessons.reduce((sum, l) => sum + l.durationMinutes, 0), course.duration);
    for (const lesson of lessons) { assert.ok(lesson.content); assert.equal(lesson.video, ""); await new Lecture(lesson).validate(); }
    for (const p of after.progresses.filter((p) => id(p.course) === m.courseId)) {
      const old = f.snapshot.progresses.find((old) => id(old._id) === id(p._id));
      assert.equal(id(old.user), id(p.user)); assert.equal(id(old.course), id(p.course));
      assert.deepEqual(p.completedLectures, []); assert.equal(progressPayload(p, lessons).percentage, 0);
    }
  }
  assert.equal(hash(after.progresses.at(-1)), hash(f.snapshot.progresses.at(-1)));
  assert.equal(hash(after.lectures.at(0).video || ""), hash(""));
  assert.equal(hash(after.courses.at(-1)), hash(f.snapshot.courses.at(-1)));
  assert.equal(hash(after.lectures.find((l) => l.title === "Unrelated lesson")), hash(f.snapshot.lectures.at(-1)));
});
test("migration: repeat apply is a no-op and preserves NEW completion activity", async () => {
  const f = setup(); let adapter = fixtureAdapter(f.snapshot); await run(adapter, f);
  const applied = await adapter.read();
  applied.progresses[0].completedLectures = [new mongoose.Types.ObjectId(f.manifest.mapping[0].newLessonIds[0])];
  adapter = fixtureAdapter(applied); const before = hash(await adapter.read());
  assert.deepEqual(await run(adapter, f), { status: "already-applied", writes: 0 });
  assert.equal(hash(await adapter.read()), before);
});
test("migration: rollback restores original documents, dates, IDs and shared media exactly", async () => {
  const f = setup(); const adapter = fixtureAdapter(f.snapshot);
  await run(adapter, f); assert.equal((await run(adapter, f, "rollback")).status, "rolled-back");
  assert.equal(snapshotHash(await adapter.read()), snapshotHash(f.snapshot));
  assert.equal((await run(adapter, f, "rollback")).status, "already-rolled-back");
});
test("migration: rollback preserves unrelated new data and user profile changes", async () => {
  const f = setup(); let adapter = fixtureAdapter(f.snapshot); await run(adapter, f);
  const applied = await adapter.read();
  applied.users[1].name = "Updated privately";
  applied.courses.at(-1).title = "New unrelated edit";
  applied.users.push({ _id: new mongoose.Types.ObjectId(), subscription: [], role: "user" });
  adapter = fixtureAdapter(applied); await run(adapter, f, "rollback");
  const after = await adapter.read();
  assert.equal(after.users[1].name, "Updated privately"); assert.equal(after.users.length, 4);
  assert.equal(after.courses.at(-1).title, "New unrelated edit");
});
test("migration: rollback refuses new target progress rather than discarding it", async () => {
  const f = setup(); let adapter = fixtureAdapter(f.snapshot); await run(adapter, f);
  const applied = await adapter.read(); applied.progresses[0].completedLectures = [new mongoose.Types.ObjectId(f.manifest.mapping[0].newLessonIds[0])];
  adapter = fixtureAdapter(applied); const before = hash(applied);
  await assert.rejects(run(adapter, f, "rollback"), /POST_MIGRATION_ACTIVITY/);
  assert.equal(hash(await adapter.read()), before);
});

const failures = [
  ["missing target course", (f) => { f.snapshot.courses.shift(); }, /TARGET_COURSE_MISSING/],
  ["fewer approved courses", (f) => { f.mapping.pop(); }, /MAPPING_COUNT/],
  ["more approved courses", (f) => { f.mapping.push(clone(f.mapping[0])); }, /MAPPING_COUNT/],
  ["missing mapped ID", (f) => { delete f.mapping[0].courseId; }, /MAPPING_INVALID/],
  ["duplicate mapping", (f) => { f.mapping[1] = clone(f.mapping[0]); }, /MAPPING_DUPLICATE/],
  ["unreviewed mapping", (f) => { f.mapping[0].reviewed = false; }, /UNREVIEWED/],
  ["extra old lesson", (f) => { f.snapshot.lectures.push({ ...clone(f.snapshot.lectures[0]), _id: new mongoose.Types.ObjectId() }); }, /OLD_LESSON_SET_CHANGED/],
  ["missing old lesson", (f) => { f.snapshot.lectures.shift(); }, /OLD_LESSON_SET_CHANGED/],
  ["custom course content", (f) => { f.snapshot.courses[0].description = "Custom authored course"; }, /CUSTOM_COURSE/],
  ["cross-course completion", (f) => { f.snapshot.progresses[0].completedLectures.push(f.snapshot.lectures[2]._id); }, /CROSS_COURSE/],
  ["external progress referencing retired lesson", (f) => { f.snapshot.progresses.at(-1).completedLectures.push(f.snapshot.lectures[0]._id); }, /INVALID_PROGRESS_RELATIONSHIP/],
  ["duplicate progress", (f) => { f.snapshot.progresses.push({ ...clone(f.snapshot.progresses[0]), _id: new mongoose.Types.ObjectId() }); }, /DUPLICATE_PROGRESS/],
  ["missing progress index", (f) => { f.snapshot.indexes.progresses = []; }, /INDEX_MISSING/],
];
for (const [name, change, error] of failures) test(`migration abort: ${name} before preparation`, () => {
  const f = migrationFixture(); change(f); const before = hash(f.snapshot);
  assert.throws(() => prepare(f.snapshot, f.mapping, f.checksums, f.covers), error);
  assert.equal(hash(f.snapshot), before);
});

const applyFailures = [
  ["snapshot changed", (f) => { f.snapshot.courses[0].price++; }, /SNAPSHOT_CHANGED/],
  ["missing backup", (f) => { f.backup = null; }, /BACKUP_MISSING_OR_CORRUPT/],
  ["corrupt backup", (f) => { f.backup.data.courses[0].price++; }, /BACKUP_MISSING_OR_CORRUPT/],
  ["invalid manifest", (f) => { f.manifest.version = "unknown"; }, /INVALID_MANIFEST/],
  ["wrong database", (f) => { f.snapshot.identity.database = "different"; }, /WRONG_DATABASE/],
  ["partial migration without journal", (f) => { f.snapshot.lectures.shift(); }, /SNAPSHOT_CHANGED/],
  ["unrecognized journal", (f) => { f.snapshot.journals.push({ _id: VERSION, manifestChecksum: "unknown", status: "partial" }); }, /UNRECOGNIZED_MIGRATION/],
  ["unverified cover", (f) => { f.manifest.mapping[0].cover.verified = false; }, /APPLY_PRECONDITIONS_FAILED/],
  ["changed source image", (f) => { f.checksums[f.mapping[0].target] = hash("changed"); }, /APPLY_PRECONDITIONS_FAILED/],
];
for (const [name, change, error] of applyFailures) test(`migration abort: ${name} leaves zero writes`, async () => {
  const f = setup(); change(f); const adapter = fixtureAdapter(f.snapshot); const before = hash(await adapter.read());
  await assert.rejects(run(adapter, f), error);
  assert.equal(hash(await adapter.read()), before);
});
test("migration: missing explicit authorization fails before transaction", async () => {
  const f = setup(); let called = false;
  await assert.rejects(execute({ transaction() { called = true; } }, "apply", f.manifest, f.backup, f.checksums, {}), /AUTHORIZATION_REQUIRED/);
  assert.equal(called, false);
});
test("migration: failure after course/lesson writes atomically discards all changes", async () => {
  const f = setup(); const adapter = fixtureAdapter(f.snapshot, 3);
  await assert.rejects(run(adapter, f), /Injected storage failure/);
  assert.equal(hash(await adapter.read()), hash(f.snapshot));
});
test("migration: failure after old lesson removal also rolls back the transaction", async () => {
  const f = setup(); const adapter = fixtureAdapter(f.snapshot, 5);
  await assert.rejects(run(adapter, f), /Injected storage failure/);
  assert.equal(hash(await adapter.read()), hash(f.snapshot));
});
test("migration: interrupted rollback preserves the complete applied state", async () => {
  const f = setup(); const first = fixtureAdapter(f.snapshot); await run(first, f);
  const applied = await first.read(); const adapter = fixtureAdapter(applied, 4);
  await assert.rejects(run(adapter, f, "rollback"), /Injected storage failure/);
  assert.equal(hash(await adapter.read()), hash(applied));
});
test("migration: backup/manifest private file round-trip retains BSON and rejects corrupt/unreadable exports", async () => {
  const f = setup(); const prefix = `fixture-${randomUUID()}`;
  await writeArtifact(`${prefix}.migration-backup.ejson`, f.backup);
  await writeArtifact(`${prefix}.migration-manifest.json`, f.manifest);
  const backup = await readArtifact(`${prefix}.migration-backup.ejson`);
  const manifest = await readArtifact(`${prefix}.migration-manifest.json`);
  verifyBackup(manifest, backup);
  assert.ok(backup.data.courses[0]._id instanceof mongoose.Types.ObjectId);
  assert.ok(backup.data.courses[0].createdAt instanceof Date);
  assert.equal((await stat(path.join(PRIVATE_ROOT, `${prefix}.migration-backup.ejson`))).mode & 0o077, 0);
  const raw = await readFile(path.join(PRIVATE_ROOT, `${prefix}.migration-manifest.json`), "utf8");
  assert.doesNotMatch(raw, /passwordHash|private-fixture-value|@example.test/);
  await writeFile(path.join(PRIVATE_ROOT, `${prefix}-corrupt.json`), "{broken", { mode: 0o600 });
  await assert.rejects(readArtifact(`${prefix}-corrupt.json`), /ARTIFACT_UNREADABLE/);
  await assert.rejects(readArtifact(`${prefix}-missing.json`), /ARTIFACT_UNREADABLE/);
  await assert.rejects(writeArtifact("../outside.json", {}), /FILENAME_REQUIRED/);
  const bsonName = `${prefix}-bson.json`;
  await writeArtifact(bsonName, { large: mongoose.mongo.BSON.Long.fromString("9223372036854775807") });
  assert.equal((await readArtifact(bsonName)).large.toString(), "9223372036854775807");
});
test("migration: database fingerprint excludes credentials and changes across destinations", () => {
  const a = identityFor("mongodb://user:private1@localhost:27017/db", "db");
  const b = identityFor("mongodb://other:private2@localhost:27017/db", "db");
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, identityFor("mongodb://localhost:27018/db", "db"));
  assert.doesNotMatch(JSON.stringify(a), /private|localhost|user/);
});
