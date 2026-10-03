// A deliberately small collection fixture, not a MongoDB replacement. Real
// Mongoose casting, validation, hashing and Express middleware remain active.
import { mock } from "node:test";
import mongoose from "mongoose";
import Course from "../../src/models/Course.js";
import Lecture from "../../src/models/Lecture.js";
import Progress from "../../src/models/Progress.js";
import User from "../../src/models/User.js";

const copy = (value) => JSON.parse(JSON.stringify(value));
const equal = (a, b) => String(a) === String(b);
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    const actual = row[key];
    if (value && typeof value === "object" && !value.toHexString) {
      if ("$ne" in value) return !equal(actual, value.$ne);
      if ("$exists" in value) return (actual !== undefined) === value.$exists;
      if ("$in" in value) return value.$in.some((v) => Array.isArray(actual) ? actual.some((a) => equal(a, v)) : equal(actual, v));
    }
    return Array.isArray(actual) ? actual.some((v) => equal(v, value)) : equal(actual, value);
  });
}
function update(row, operation, inserted = false) {
  if (inserted) Object.assign(row, copy(operation.$setOnInsert || {}));
  Object.assign(row, copy(operation.$set || {}));
  for (const [key, value] of Object.entries(operation.$inc || {})) row[key] = (row[key] || 0) + value;
  for (const [key, value] of Object.entries(operation.$pull || {})) row[key] = (row[key] || []).filter((v) => !equal(v, value));
  for (const [key, value] of Object.entries(operation.$addToSet || {})) {
    row[key] ||= [];
    if (!row[key].some((v) => equal(v, value))) row[key].push(String(value));
  }
}
function project(row, projection = {}) {
  if (!row) return null;
  const included = Object.keys(projection).filter((key) => projection[key] === 1);
  const result = included.length ? Object.fromEntries(["_id", ...included].filter((key) => key in row).map((key) => [key, row[key]])) : copy(row);
  for (const [key, value] of Object.entries(projection)) if (value === 0) delete result[key];
  return result;
}
export const ids = { course: "000000000000000000000001", other: "000000000000000000000002", first: "000000000000000000000011", second: "000000000000000000000012", foreign: "000000000000000000000013", admin: "000000000000000000000021", user: "000000000000000000000022", guest: "000000000000000000000023" };
export const fields = { title: "Fixture course", description: "Test description", category: "Yoga", level: "Beginner", createdBy: "Test author", duration: 10, durationUnit: "minutes", learningOutcomes: ["Learn the basics"] };

export async function installFixture() {
  mock.method(mongoose, "connect", async () => { throw new Error("Tests must not connect to MongoDB"); });
  mock.method(mongoose, "createConnection", () => { throw new Error("Tests must not connect to MongoDB"); });
  const tables = new Map();
  for (const Model of [Course, Lecture, Progress, User]) {
    const rows = [];
    tables.set(Model.modelName, rows);
    const collection = Model.collection;
    mock.method(collection, "find", (filter = {}, options = {}) => ({ toArray: async () => {
      const found = rows.filter((row) => matches(row, filter));
      if (options.sort) found.sort((a, b) => { for (const [key, direction] of Object.entries(options.sort)) { const diff = String(a[key]).localeCompare(String(b[key])); if (diff) return diff * direction; } return 0; });
      return found.map((row) => project(row, options.projection));
    } }));
    mock.method(collection, "findOne", async (filter, options = {}) => project(rows.find((row) => matches(row, filter)), options.projection));
    mock.method(collection, "countDocuments", async (filter = {}) => rows.filter((row) => matches(row, filter)).length);
    mock.method(collection, "insertOne", async (document) => {
      if (Model === User && rows.some((row) => row.email === document.email)) throw Object.assign(new Error("Duplicate"), { code: 11000, keyValue: { email: document.email } });
      rows.push(copy(document)); return { acknowledged: true, insertedId: document._id };
    });
    mock.method(collection, "findOneAndUpdate", async (filter, operation, options = {}) => {
      let row = rows.find((row) => matches(row, filter)); let inserted = false;
      if (!row && options.upsert) {
        if (Model === Progress && rows.some((r) => equal(r.user, filter.user) && equal(r.course, filter.course))) throw Object.assign(new Error("Duplicate"), { code: 11000 });
        row = { ...copy(filter), _id: String(new mongoose.Types.ObjectId()) }; rows.push(row); inserted = true;
      }
      if (!row) return null;
      update(row, operation, inserted); return copy(row);
    });
    for (const method of ["updateOne", "updateMany"]) mock.method(collection, method, async (filter, operation) => {
      const found = rows.filter((row) => matches(row, filter)).slice(0, method === "updateOne" ? 1 : undefined);
      found.forEach((row) => update(row, operation)); return { acknowledged: true, matchedCount: found.length, modifiedCount: found.length };
    });
    for (const method of ["deleteOne", "deleteMany"]) mock.method(collection, method, async (filter) => {
      let deletedCount = 0;
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], filter)) { rows.splice(i, 1); deletedCount++; if (method === "deleteOne") break; }
      return { acknowledged: true, deletedCount };
    });
  }
  const admin = new User({ _id: ids.admin, name: "Private admin", email: "admin@example.test", role: "admin" });
  await admin.setPassword("private-test-password"); await admin.save();
  for (const [key, enrolled] of [["user", true], ["guest", false]]) await User.create({ _id: ids[key], name: key, email: `${key}@example.test`, passwordHash: "unused-fixture-hash", subscription: enrolled ? [ids.course] : [] });
  for (const key of ["course", "other"]) await Course.create({ _id: ids[key], ...fields, image: `https://example.test/${key}.jpg`, price: 0 });
  for (const [key, course] of [["first", ids.course], ["second", ids.course], ["foreign", ids.other]]) await Lecture.create({ _id: ids[key], course, title: key, content: "Written fixture content", durationMinutes: 5 });
  return tables;
}
