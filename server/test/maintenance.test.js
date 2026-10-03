import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { installFixture, ids } from "./support/fixture.js";
import { maintenanceReadOnly, validateEnv } from "../src/config/env.js";
import Course from "../src/models/Course.js";
import Lecture from "../src/models/Lecture.js";
import Progress from "../src/models/Progress.js";
import User from "../src/models/User.js";

// Never load local credentials. Every HTTP request targets this fixture server.
Object.assign(process.env, { NODE_ENV: "test", JWT_SECRET: "maintenance-fixture-only", CLOUDINARY_CLOUD_NAME: "isolated", CLOUDINARY_API_KEY: "test-only", CLOUDINARY_API_SECRET: "test-only", CLIENT_ORIGIN: "http://localhost:5173" });
delete process.env.MONGO_URI;
delete process.env.MIGRATION_MONGO_URI;
const { createApp } = await import("../src/app.js");
const { signToken } = await import("../src/middleware/auth.js");
const { default: cloudinary } = await import("../src/config/cloudinary.js");
let server, base, tables, mediaCalls;
async function start(value = "true") {
  if (value === null) delete process.env.MAINTENANCE_READ_ONLY;
  else process.env.MAINTENANCE_READ_ONLY = value;
  tables = await installFixture(); mediaCalls = 0;
  for (const method of ["upload_stream", "destroy"]) mock.method(cloudinary.uploader, method, () => { mediaCalls++; throw new Error("Unexpected media side effect"); });
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  base = `http://127.0.0.1:${server.address().port}`;
}
afterEach(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  server = null; mock.restoreAll(); delete process.env.MAINTENANCE_READ_ONLY;
});
const snapshot = () => JSON.stringify([...tables]);
const calls = () => [Course, Lecture, Progress, User].flatMap(Model => ["find", "findOne", "insertOne", "findOneAndUpdate", "updateOne", "updateMany", "deleteOne", "deleteMany"].map(method => Model.collection[method].mock.callCount()));
async function blocked(path, method, { body = "{}", contentType = "application/json", token = signToken(ids.admin) } = {}) {
  const before = snapshot(), beforeCalls = calls();
  const response = await fetch(base + path, { method, headers: { "Content-Type": contentType, Authorization: `Bearer ${token}`, Origin: "http://localhost:5173" }, body });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { message: "YogaBliss is temporarily read-only for maintenance." });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(snapshot(), before); assert.deepEqual(calls(), beforeCalls); assert.equal(mediaCalls, 0);
}

test("maintenance configuration: exact booleans, default off, invalid values fail startup", () => {
  assert.equal(maintenanceReadOnly({}), false);
  assert.equal(maintenanceReadOnly({ MAINTENANCE_READ_ONLY: "false" }), false);
  assert.equal(maintenanceReadOnly({ MAINTENANCE_READ_ONLY: "true" }), true);
  for (const value of ["", "TRUE", "False", "1", "yes", " true "]) {
    assert.throws(() => validateEnv({ MAINTENANCE_READ_ONLY: value }), /MAINTENANCE_READ_ONLY/);
    process.env.MAINTENANCE_READ_ONLY = value;
    assert.throws(() => createApp(), /MAINTENANCE_READ_ONLY/);
  }
});
for (const value of [null, "false"]) test(`maintenance off (${value ?? "absent"}): normal enrollment and progress writes succeed`, async () => {
  await start(value);
  const headers = { Authorization: `Bearer ${signToken(ids.guest)}`, "Content-Type": "application/json" };
  assert.equal((await fetch(`${base}/api/courses/${ids.course}/enroll`, { method: "POST", headers })).status, 200);
  const response = await fetch(`${base}/api/courses/${ids.course}/progress`, { method: "POST", headers, body: JSON.stringify({ lectureId: ids.first }) });
  assert.equal(response.status, 200); assert.equal((await response.json()).completed, 1);
  assert.equal(tables.get("Progress").length, 1);
});

const operations = [
  ["registration", "/api/auth/register", "POST"],
  ["login", "/api/auth/login", "POST"],
  ["enrollment", `/api/courses/${ids.course}/enroll`, "POST"],
  ["completion", `/api/courses/${ids.course}/progress`, "POST"],
  ["admin course create", "/api/admin/courses", "POST"],
  ["admin course edit", `/api/admin/courses/${ids.course}`, "PUT"],
  ["admin course delete", `/api/admin/courses/${ids.course}`, "DELETE"],
  ["lesson create", `/api/admin/courses/${ids.course}/lectures`, "POST"],
  ["lesson edit", `/api/admin/lectures/${ids.first}`, "PUT"],
  ["lesson delete", `/api/admin/lectures/${ids.first}`, "DELETE"],
  ["lesson reorder", `/api/admin/courses/${ids.course}/lectures/order`, "PUT"],
  ["PATCH", `/api/admin/courses/${ids.course}`, "PATCH"],
  ["future/unknown API route", "/api/future-write", "POST"],
];
for (const [name, path, method] of operations) test(`maintenance on: direct ${name} blocked with zero database/media calls`, async () => {
  await start(); await blocked(path, method);
});
test("maintenance on: blocks malformed JSON before parsing and invalid tokens before authentication", async () => {
  await start(); await blocked("/api/admin/courses", "POST", { body: "{invalid", token: "invalid-token" });
});
test("maintenance on: image/video multipart requests blocked before upload processing", async () => {
  await start();
  for (const [path, type] of [["/api/admin/courses", "image/jpeg"], [`/api/admin/courses/${ids.course}/lectures`, "video/mp4"]]) {
    const boundary = "fixture-boundary";
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture"\r\nContent-Type: ${type}\r\n\r\ninvalid-file-bytes\r\n--${boundary}--\r\n`;
    await blocked(path, "POST", { body, contentType: `multipart/form-data; boundary=${boundary}` });
  }
});
test("maintenance on: public/authenticated/admin GET and HEAD remain available", async () => {
  await start(); const before = snapshot();
  for (const [path, user] of [["/api/courses", null], ["/api/auth/me", ids.user], ["/api/courses/mine", ids.user], [`/api/courses/${ids.course}/lectures`, ids.user], ["/api/admin/courses", ids.admin]]) {
    const headers = user ? { Authorization: `Bearer ${signToken(user)}` } : {};
    assert.equal((await fetch(base + path, { headers })).status, 200);
    const head = await fetch(base + path, { method: "HEAD", headers });
    assert.equal(head.status, 200); assert.equal(await head.text(), "");
  }
  assert.equal(snapshot(), before); assert.equal(mediaCalls, 0);
});
test("maintenance on: OPTIONS preflight allows the configured origin without side effects", async () => {
  await start(); const before = snapshot(), beforeCalls = calls();
  const response = await fetch(base + "/api/admin/courses", { method: "OPTIONS", headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "POST" } });
  assert.equal(response.status, 204); assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(snapshot(), before); assert.deepEqual(calls(), beforeCalls);
});
test("maintenance on: health retains connected/degraded readiness semantics", async () => {
  await start();
  const disconnected = await fetch(base + "/api/health");
  assert.equal(disconnected.status, 503); assert.equal((await disconnected.json()).database, "disconnected");
  Object.defineProperty(mongoose.connection, "readyState", { configurable: true, get: () => 1 });
  try {
    const connected = await fetch(base + "/api/health"); assert.equal(connected.status, 200);
    assert.deepEqual(await connected.json(), { status: "ok", process: "running", database: "connected" });
    assert.equal((await fetch(base + "/api/health", { method: "HEAD" })).status, 200);
  } finally { delete mongoose.connection.readyState; }
});
