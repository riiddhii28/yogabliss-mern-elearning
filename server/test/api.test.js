import test, { before, after, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { installFixture, ids, fields } from "./support/fixture.js";
import mongoose from "mongoose";
import Course from "../src/models/Course.js";
import Progress from "../src/models/Progress.js";
import User from "../src/models/User.js";

// No dotenv import: ignore any developer/production credentials in .env.
Object.assign(process.env, { NODE_ENV: "test", JWT_SECRET: "isolated-test-only", CLOUDINARY_CLOUD_NAME: "isolated", CLOUDINARY_API_KEY: "test-only", CLOUDINARY_API_SECRET: "test-only", CLIENT_ORIGIN: "http://localhost:5173" });
delete process.env.MONGO_URI;
process.env.MAINTENANCE_READ_ONLY = "false";
const { createApp } = await import("../src/app.js");
const { signToken } = await import("../src/middleware/auth.js");
const { default: cloudinary } = await import("../src/config/cloudinary.js");
let server, base, tables, deleted, uploaded;
before(async () => { server = createApp().listen(0, "127.0.0.1"); await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); }); base = `http://127.0.0.1:${server.address().port}/api`; });
after(async () => { if (server?.listening) await new Promise((resolve) => server.close(resolve)); });
beforeEach(async () => {
  tables = await installFixture(); deleted = []; uploaded = [];
  mock.method(cloudinary.uploader, "destroy", async (id) => { deleted.push(id); return { result: "ok" }; });
  mock.method(cloudinary.uploader, "upload_stream", (options, callback) => new Writable({ write(chunk, encoding, next) { next(); }, final(next) {
    const result = { public_id: options.public_id, resource_type: options.resource_type, secure_url: `https://res.cloudinary.com/isolated/${options.resource_type}/upload/v1/${options.public_id}.jpg` };
    uploaded.push(result); callback(null, result); next();
  } }));
});
afterEach(() => { assert.equal(mongoose.connection.readyState, 0); mock.restoreAll(); });
async function request(path, { method = "GET", body, user = ids.user } = {}) {
  const headers = {}; if (user) headers.Authorization = `Bearer ${signToken(user)}`;
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(base + path, { method, headers, body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined });
  return { data: await response.json(), status: response.status, headers: response.headers };
}
const complete = (lectureId, user = ids.user) => request(`/courses/${ids.course}/progress`, { method: "POST", body: { lectureId }, user });
const enroll = (user = ids.guest) => request(`/courses/${ids.course}/enroll`, { method: "POST", user });
const admin = (path, method = "GET", body) => request(path, { method, body, user: ids.admin });
function multipart(values, file) { const form = new FormData(); for (const [key, value] of Object.entries(values)) form.set(key, Array.isArray(value) ? JSON.stringify(value) : value); if (file) form.set("file", new Blob([file], { type: "image/jpeg" }), "cover.jpg"); return form; }
const jpeg = Buffer.from([255, 216, 255, 224, 0, 0, 255, 217]);
const written = { title: "New lesson", description: "", content: "Real written lesson", type: "written", durationMinutes: 3, order: 2 };

test("registration and login hash passwords and reject invalid credentials", async () => {
  const body = { name: "New user", email: "new@example.test", password: "test-password" };
  const registered = await request("/auth/register", { method: "POST", body, user: null });
  assert.equal(registered.status, 201); assert.ok(registered.data.token); assert.equal(registered.data.user.passwordHash, undefined);
  const stored = tables.get("User").find((u) => u.email === body.email); assert.notEqual(stored.passwordHash, body.password);
  assert.equal((await request("/auth/login", { method: "POST", body, user: null })).status, 200);
  assert.equal((await request("/auth/login", { method: "POST", body: { ...body, password: "wrong" }, user: null })).status, 401);
  assert.equal((await request("/auth/register", { method: "POST", body, user: null })).status, 409);
});
test("protected routes and all admin mutations reject unauthorized users", async () => {
  assert.equal((await request(`/courses/${ids.course}/lectures`, { user: null })).status, 401);
  assert.equal((await request(`/courses/${ids.course}/lectures`, { user: ids.guest })).status, 403);
  for (const [path, method] of [["/admin/courses", "POST"], [`/admin/courses/${ids.course}`, "PUT"], [`/admin/courses/${ids.course}`, "DELETE"], [`/admin/courses/${ids.course}/lectures`, "POST"], [`/admin/lectures/${ids.first}`, "PUT"], [`/admin/lectures/${ids.first}`, "DELETE"], [`/admin/courses/${ids.course}/lectures/order`, "PUT"]]) assert.equal((await request(path, { method })).status, 403);
  assert.equal((await admin("/admin/courses")).status, 200);
});
test("the formerly published admin password blocks even an existing JWT", async () => {
  const user = await User.findById(ids.admin).select("+passwordHash"); await user.setPassword("admin123"); await user.save();
  assert.equal((await admin("/admin/courses")).status, 403);
});
test("first and repeated enrollment are idempotent", async () => {
  assert.equal((await enroll()).status, 200); assert.equal((await enroll()).status, 200);
  assert.equal(tables.get("Progress").length, 1);
  assert.deepEqual(tables.get("User").find((u) => u._id === ids.guest).subscription, [ids.course]);
});
test("enrollment repairs missing progress without duplicating subscription", async () => {
  assert.equal((await enroll(ids.user)).status, 200); assert.equal(tables.get("Progress").length, 1);
  assert.deepEqual(tables.get("User").find((u) => u._id === ids.user).subscription, [ids.course]);
});
test("valid, duplicate and complete progress returns 0%, 50%, 100%", async () => {
  assert.equal((await request(`/courses/${ids.course}/progress`)).data.percentage, 0);
  assert.equal((await complete(ids.first)).data.percentage, 50);
  const repeated = await Promise.all([complete(ids.first), complete(ids.first)]); assert.ok(repeated.every((r) => r.data.completed === 1));
  assert.equal((await complete(ids.second)).data.percentage, 100);
  assert.equal(tables.get("Progress")[0].completedLectures.length, 2);
});
test("invalid, missing, foreign and non-enrolled completions are rejected", async () => {
  assert.equal((await complete("bad")).status, 400);
  assert.equal((await complete("000000000000000000000099")).status, 404);
  assert.equal((await complete(ids.foreign)).status, 404);
  assert.equal((await complete(ids.first, ids.guest)).status, 403);
  assert.equal(tables.get("Progress").length, 0);
});
test("stale and duplicate references cannot inflate individual or dashboard progress", async () => {
  await Progress.create({ user: ids.user, course: ids.course, completedLectures: [ids.first, ids.first, ids.foreign, "000000000000000000000099"] });
  assert.equal((await request(`/courses/${ids.course}/progress`)).data.percentage, 50);
  assert.deepEqual((await request("/courses/mine/progress")).data.progress[ids.course], { percentage: 50, completed: 1, total: 2 });
});
test("course create/update validate fields and preserve media on metadata edits", async () => {
  const bad = await admin("/admin/courses", "POST", multipart({ ...fields, duration: 0 }, jpeg)); assert.equal(bad.status, 422); assert.equal(uploaded.length, 0);
  const created = await admin("/admin/courses", "POST", multipart(fields, jpeg)); assert.equal(created.status, 201); assert.equal(created.data.course.price, 0);
  const changed = await admin(`/admin/courses/${created.data.course._id}`, "PUT", multipart({ ...fields, title: "Changed" })); assert.equal(changed.status, 200); assert.equal(changed.data.course.image, created.data.course.image);
});
test("course deletion removes lectures, progress and enrollment", async () => {
  await complete(ids.first); assert.equal((await admin(`/admin/courses/${ids.course}`, "DELETE")).status, 200);
  assert.ok(!tables.get("Course").some((c) => c._id === ids.course)); assert.ok(!tables.get("Lecture").some((l) => l.course === ids.course)); assert.equal(tables.get("Progress").length, 0);
  assert.deepEqual(tables.get("User").find((u) => u._id === ids.user).subscription, []);
});
test("written lessons create and edit without videos; deletion reconciles progress/order", async () => {
  const created = await admin(`/admin/courses/${ids.course}/lectures`, "POST", multipart(written)); assert.equal(created.status, 201); assert.equal(created.data.lecture.video, "");
  const lessonId = created.data.lecture._id;
  assert.equal((await admin(`/admin/lectures/${lessonId}`, "PUT", multipart({ ...written, content: "Updated content" }))).data.lecture.content, "Updated content");
  await complete(lessonId); assert.equal((await admin(`/admin/lectures/${lessonId}`, "DELETE")).status, 200);
  assert.ok(!tables.get("Progress")[0].completedLectures.includes(lessonId)); assert.ok(!tables.get("Course")[0].lessonOrder.includes(lessonId));
});
test("reordering drives public curriculum and enrolled lessons without content leakage", async () => {
  assert.equal((await admin(`/admin/courses/${ids.course}/lectures/order`, "PUT", { lessonIds: [ids.second, ids.first] })).status, 200);
  const detail = (await request(`/courses/${ids.course}`, { user: null })).data;
  assert.deepEqual(detail.curriculum.map((l) => l.id), [ids.second, ids.first]); assert.ok(detail.curriculum.every((l) => !("content" in l) && !("video" in l)));
  assert.deepEqual((await request(`/courses/${ids.course}/lectures`)).data.lectures.map((l) => l._id), [ids.second, ids.first]);
  assert.equal((await admin(`/admin/courses/${ids.course}/lectures/order`, "PUT", { lessonIds: [ids.first, ids.foreign] })).status, 409);
});
test("shared covers survive replacement; failed replacements preserve old references", async () => {
  const url = "https://res.cloudinary.com/isolated/image/upload/v1/shared.jpg";
  for (const row of tables.get("Course")) { row.image = url; row.imageId = "shared"; }
  assert.equal((await admin(`/admin/courses/${ids.course}`, "PUT", multipart(fields, jpeg))).status, 200); assert.ok(!deleted.includes("shared"));
  const old = tables.get("Course")[0].image;
  mock.method(Course.collection, "findOneAndUpdate", async () => { throw new Error("Simulated database failure"); });
  assert.equal((await admin(`/admin/courses/${ids.course}`, "PUT", multipart(fields, jpeg))).status, 500);
  assert.equal(tables.get("Course")[0].image, old); assert.ok(deleted.includes(uploaded.at(-1).public_id));
});
test("health, CORS, malformed IDs and multipart validation are classified", async () => {
  assert.equal((await request("/health", { user: null })).status, 503);
  assert.equal((await request("/courses/not-an-id")).status, 400);
  assert.equal((await admin("/admin/courses", "POST", multipart(fields, Buffer.from("fake jpeg")))).status, 415);
  assert.equal((await admin("/admin/courses", "POST", multipart(fields, Buffer.alloc(5 * 1024 * 1024 + 1)))).status, 413);
  const response = await fetch(base + "/courses", { headers: { Origin: "https://untrusted.example" } }); assert.equal(response.headers.get("access-control-allow-origin"), null);
});
