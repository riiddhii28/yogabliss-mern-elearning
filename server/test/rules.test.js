import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateEnv } from "../src/config/env.js";
import { validateUpload } from "../src/middleware/upload.js";
import { sameAsset } from "../src/services/media.js";
import { progressPayload } from "../src/services/progress.js";
import { orderLessons } from "../src/services/lessonOrder.js";
import { COURSES } from "../src/seed/catalog.js";

test("production config requires complete Cloudinary, private JWT and explicit origins", () => {
  const env = { NODE_ENV: "production", MONGO_URI: "unused-test-value", JWT_SECRET: "a".repeat(40), CLIENT_ORIGIN: "https://example.test", CLOUDINARY_CLOUD_NAME: "fixture", CLOUDINARY_API_KEY: "fixture", CLOUDINARY_API_SECRET: "fixture" };
  validateEnv(env);
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLIENT_ORIGIN", "JWT_SECRET"]) assert.throws(() => validateEnv({ ...env, [key]: "" }));
  for (const origin of ["*", "https://example.test/path", "https://user:pass@example.test"]) assert.throws(() => validateEnv({ ...env, CLIENT_ORIGIN: origin }));
  assert.throws(() => validateEnv({ ...env, JWT_SECRET: "replace_me_with_a_long_random_string" }));
  validateEnv({ MONGO_URI: "unused", JWT_SECRET: "development-only" });
});
test("upload rules reject unsupported MIME, forged contents and oversized video", () => {
  assert.throws(() => validateUpload({ mimetype: "image/svg+xml", buffer: Buffer.from("<svg/>"), size: 6 }, "image"), (error) => error.status === 415);
  assert.throws(() => validateUpload({ mimetype: "video/mp4", buffer: Buffer.from("not video"), size: 9 }, "video"), (error) => error.status === 415);
  assert.throws(() => validateUpload({ mimetype: "video/mp4", buffer: Buffer.alloc(0), size: 25 * 1024 * 1024 + 1 }, "video"), (error) => error.status === 413);
});
test("media identity protects transformed Cloudinary assets and local aliases", () => {
  assert.equal(sameAsset({ url: "uploads/shared.jpg" }, { url: "https://example.test/uploads/shared.jpg" }), true);
  assert.equal(sameAsset({ url: "https://res.cloudinary.com/test/video/upload/v1/shared.mp4", publicId: "shared" }, { url: "https://res.cloudinary.com/test/video/upload/w_300/v1/shared.mp4" }), true);
  assert.equal(sameAsset({ url: "uploads/a.jpg" }, { url: "uploads/b.jpg" }), false);
});
test("empty curriculum stays at zero and legacy order is deterministic", () => {
  assert.deepEqual(progressPayload({ completedLectures: ["gone"] }, []), { percentage: 0, completed: 0, total: 0, completedLectures: [] });
  const lessons = [{ _id: "b", createdAt: "2026-01-01" }, { _id: "a", createdAt: "2026-01-01" }];
  assert.deepEqual(orderLessons({}, lessons).map((l) => l._id), ["a", "b"]);
});
test("curated catalog has three distinct attributed covers and nine real written lessons", async () => {
  assert.deepEqual(COURSES.map((c) => c.image), ["uploads/hatha-foundations.jpg", "uploads/vinyasa-flow-strength.jpg", "uploads/mindful-meditation-breathwork.jpg"]);
  const credits = await readFile(new URL("../../MEDIA_SOURCES.md", import.meta.url), "utf8");
  const hashes = [];
  for (const course of COURSES) {
    assert.equal(course.durationUnit, "minutes"); assert.equal(course.price, 0); assert.equal(course.lessons.length, 3);
    assert.ok(course.learningOutcomes.length);
    for (const lesson of course.lessons) { assert.ok(lesson.content.length > 100); assert.ok(!lesson.video); }
    const image = await readFile(new URL(`../${course.image}`, import.meta.url));
    assert.equal(image.subarray(0, 3).toString("hex"), "ffd8ff");
    hashes.push(createHash("sha256").update(image).digest("hex"));
    assert.ok(credits.includes(course.image.split("/").at(-1)));
  }
  assert.equal(new Set(hashes).size, 3);
});

test("public documentation contains no old admin password and private env files stay ignored", async () => {
  const { execFileSync, spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  for (const path of ["README.md", "DEPLOY.md", "PROJECT_GUIDE.md", "client/src/pages/Login.jsx"]) {
    assert.doesNotMatch(await readFile(new URL(`../../${path}`, import.meta.url), "utf8"), /admin123/);
  }
  for (const path of ["server/.env", "server/.env.production", "client/.env.production", "client/dist/index.html", "server/node_modules/example", ".DS_Store"]) {
    execFileSync("git", ["check-ignore", "--no-index", "--quiet", path], { cwd: root });
  }
  assert.equal(spawnSync("git", ["check-ignore", "--no-index", "--quiet", "server/.env.example"], { cwd: root }).status, 1);
});
