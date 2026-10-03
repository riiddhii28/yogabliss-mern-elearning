import test, { before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { create, act } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { returnDestination } from "../src/utils/navigation.js";
import { studySummary } from "../src/utils/study.js";

const id = "000000000000000000000001";
const course = { _id: id, title: "Fixture yoga", description: "A real introduction", category: "Yoga", level: "Beginner", duration: 10, durationUnit: "minutes", image: "uploads/fixture.jpg", learningOutcomes: ["Learn safely"] };
const lessons = [{ _id: "second", title: "Second, moved first", content: "Written lesson content", video: "" }, { _id: "first", title: "First, moved second", content: "More written content", video: "" }];
let vite, App, UserProvider, CourseProvider, api, renderer, saved, responses;
const storage = new Map();
const h = React.createElement;
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve)); };
function failure(config, status = 500) { return Object.assign(new Error("Fixture request failed"), { config, response: { status, data: { error: "Please retry" } } }); }
before(async () => {
  vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false, watch: null, preTransformRequests: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] }, esbuild: { jsx: "automatic" } });
  ({ default: App } = await vite.ssrLoadModule("/src/App.jsx"));
  ({ UserProvider } = await vite.ssrLoadModule("/src/context/UserContext.jsx"));
  ({ CourseProvider } = await vite.ssrLoadModule("/src/context/CourseContext.jsx"));
  ({ default: api } = await vite.ssrLoadModule("/src/api.js"));
  await vite.ssrLoadModule("/src/pages/Admin.jsx");
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
});
after(async () => { await vite?.close(); delete globalThis.localStorage; });
beforeEach(() => {
  storage.clear(); saved = []; responses = {};
  // The adapter replaces HTTP only; React hooks, context and router stay real.
  api.defaults.adapter = async (config) => {
    if (responses[config.url]) return responses[config.url](config);
    let data;
    if (config.url === "/auth/me") data = { user: { id: "user", name: "Learner", role: "user", subscription: [id] } };
    else if (["/auth/login", "/auth/register"].includes(config.url)) data = { token: "fixture-token", user: { id: "user", name: "Learner", role: "user", subscription: config.url === "/auth/login" ? [id] : [] } };
    else if (config.url === "/courses") data = { courses: [course] };
    else if (config.url === `/courses/${id}`) data = { course, curriculum: lessons.map((l) => ({ id: l._id, title: l.title, hasVideo: Boolean(l.video) })) };
    else if (config.url === `/courses/${id}/lectures`) data = { lectures: lessons };
    else if (config.url === `/courses/${id}/enroll`) data = { course, message: "Enrolled" };
    else if (config.url === `/courses/${id}/progress`) {
      if (config.method === "post") saved = [...new Set([...saved, JSON.parse(config.data).lectureId])];
      data = { completedLectures: saved, completed: saved.length, total: 2, percentage: saved.length * 50 };
    } else if (config.url === "/courses/mine") data = { courses: [course] };
    else if (config.url === "/courses/mine/progress") data = { progress: { [id]: { completed: saved.length, total: 2, percentage: saved.length * 50 } } };
    else throw new Error(`Unexpected API request: ${config.url}`);
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
});
afterEach(async () => { if (renderer) await act(async () => { renderer.unmount(); await flush(); }); renderer = null; });
async function mount(path, authenticated = false) {
  if (authenticated) storage.set("yb_token", "fixture-token");
  await act(async () => { renderer = create(h(MemoryRouter, { initialEntries: [path], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, h(UserProvider, null, h(CourseProvider, null, h(App))))); await flush(); });
}
function text(node) { if (node == null) return ""; if (typeof node === "string") return node; if (Array.isArray(node)) return node.map(text).join(""); return text(node.children); }
const page = () => text(renderer.toJSON());
const button = (label) => renderer.root.findAllByType("button").find((node) => text(node).includes(label));
async function click(label) { const node = button(label); assert.ok(node, `Missing button: ${label}`); await act(async () => { await node.props.onClick(); await flush(); }); }
async function follow(href) { const node = renderer.root.findAllByType("a").find((node) => node.props.href.startsWith(href)); assert.ok(node); await act(async () => { node.props.onClick({ button: 0, preventDefault() {}, defaultPrevented: false }); await flush(); }); }
async function submitAuth() { await act(async () => { await renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }); await flush(); }); }

test("return destinations reject unsafe URLs and preserve supported course routes", () => {
  for (const value of ["https://evil.test", "//evil.test", "/login", "/\\evil.test", "/%2f%2fevil.test"]) assert.equal(returnDestination(`?returnTo=${encodeURIComponent(value)}`), "/");
  assert.equal(returnDestination(`?returnTo=${encodeURIComponent(`/course/${id}`)}`), `/course/${id}`);
});
test("resume handles stale IDs, reordered lessons and completed/empty courses", () => {
  assert.equal(studySummary(lessons, ["deleted"]).firstUnfinished, "second");
  assert.equal(studySummary(lessons, ["second"]).firstUnfinished, "first");
  assert.equal(studySummary(lessons, ["first", "second"]).complete, true);
  assert.equal(studySummary([], []).complete, false);
});
test("visitor browses Home, Courses and public course details", async () => {
  await mount("/"); assert.match(page(), /Find Your Balance/); await click("Start Your Journey");
  await follow(`/course/${id}`); assert.match(page(), /Learn safely/); assert.match(page(), /Course curriculum/); assert.ok(button("Enroll for Free"));
});
test("guest enroll preserves destination through registration and opens written Study", async () => {
  await mount(`/course/${id}`); await click("Enroll for Free");
  const signup = renderer.root.findAllByType("a").find((node) => node.props.href.startsWith("/register?")); assert.ok(signup.props.href.includes(encodeURIComponent(`/course/${id}`)));
  await follow("/register?"); await submitAuth(); assert.ok(button("Enroll for Free"));
  await click("Enroll for Free"); assert.match(page(), /Written lesson content/); assert.equal(renderer.root.findAllByType("video").length, 0);
});
test("returning login reaches My Courses and resumes the first unfinished lesson", async () => {
  saved = ["second"]; await mount("/login?returnTo=%2Faccount"); await submitAuth(); await follow(`/course/study/${id}`);
  assert.match(page(), /More written content/); assert.equal(button("Next Lesson").props.disabled, true);
});
test("written lesson navigation, saving completion and reviewing work together", async () => {
  await mount(`/course/study/${id}`, true); assert.equal(renderer.root.findAllByType("video").length, 0);
  assert.match(page(), /Written lesson content/); await click("Next Lesson"); assert.match(page(), /More written content/); await click("Previous Lesson");
  await click("Mark Complete"); assert.match(page(), /Progress saved/); await click("Next Lesson"); await click("Mark Complete"); assert.match(page(), /Course complete/);
  await click("Review course"); assert.equal(button("Completed").props.disabled, true);
});
test("video lessons render controls and retain on-ended completion", async () => {
  responses[`/courses/${id}/lectures`] = async (config) => ({ config, status: 200, data: { lectures: [{ ...lessons[0], video: "https://example.test/lesson.mp4", content: "" }] } });
  await mount(`/course/study/${id}`, true); const video = renderer.root.findByType("video"); assert.equal(video.props.controls, true);
  await act(async () => { await video.props.onEnded(); await flush(); }); assert.match(page(), /Course complete/);
});
test("failed completion retains progress; pending saves suppress duplicate requests", async () => {
  let rejectSave, count = 0;
  responses[`/courses/${id}/progress`] = (config) => config.method === "post" ? (count++, new Promise((resolve, reject) => { rejectSave = () => reject(failure(config)); })) : Promise.resolve({ config, status: 200, data: { completedLectures: [], completed: 0, total: 2, percentage: 0 } });
  await mount(`/course/study/${id}`, true); const mark = button("Mark Complete");
  await act(async () => { mark.props.onClick(); mark.props.onClick(); await flush(); }); assert.equal(count, 1); assert.ok(button("Saving").props.disabled);
  await act(async () => { rejectSave(); await flush(); }); assert.match(page(), /completion hasn't been confirmed/); assert.ok(button("Retry saving completion")); assert.deepEqual(saved, []);
});
test("catalog loading, error, retry and empty states are distinct", async () => {
  let rejectCatalog;
  responses["/courses"] = (config) => new Promise((resolve, reject) => { rejectCatalog = () => reject(failure(config)); });
  await mount("/courses"); assert.match(page(), /Loading courses/);
  await act(async () => { rejectCatalog(); await flush(); }); assert.match(page(), /Couldn't load/);
  responses["/courses"] = async (config) => ({ config, status: 200, data: { courses: [] } }); await click("Retry"); assert.match(page(), /No courses available/);
});
test("temporary session failure retains saved token and retry restores account", async () => {
  responses["/auth/me"] = async (config) => { throw failure(config); };
  await mount("/account", true); assert.match(page(), /Session temporarily unavailable/); assert.equal(storage.get("yb_token"), "fixture-token");
  delete responses["/auth/me"]; await click("Retry"); assert.match(page(), /My Courses/);
});
test("genuine 401 clears the saved session and returns to login", async () => {
  responses["/auth/me"] = async (config) => { throw failure(config, 401); };
  await mount("/account", true); assert.equal(storage.has("yb_token"), false); assert.match(page(), /Welcome back/);
});


test("admin edits courses and creates, reorders, edits and deletes written lessons", async () => {
  let managed = lessons.map((lesson, index) => ({ ...lesson, durationMinutes: 5, order: index + 1 }));
  let current = { ...course, createdBy: "Author", lessonCount: 2 };
  const reply = (config, data) => ({ config, status: 200, data });
  responses["/auth/me"] = async (config) => reply(config, { user: { id: "admin", name: "Admin", role: "admin", subscription: [] } });
  responses["/admin/courses"] = async (config) => reply(config, { courses: [current] });
  responses["/admin/stats"] = async (config) => reply(config, { stats: { totalCourses: 1, totalLectures: managed.length, totalUsers: 1 } });
  responses["/admin/users"] = async (config) => reply(config, { users: [] });
  responses[`/admin/courses/${id}`] = async (config) => { current = { ...current, title: config.data.get("title") }; return reply(config, { message: "Course updated", course: current }); };
  responses[`/admin/courses/${id}/lectures`] = async (config) => {
    if (config.method === "post") { managed.push({ _id: "new", title: config.data.get("title"), content: config.data.get("content"), durationMinutes: 3, order: 3 }); return reply(config, { message: "Lesson created" }); }
    return reply(config, { course: current, lectures: managed });
  };
  responses[`/admin/courses/${id}/lectures/order`] = async (config) => { managed = JSON.parse(config.data).lessonIds.map((id, index) => ({ ...managed.find((lesson) => lesson._id === id), order: index + 1 })); return reply(config, { message: "Lesson order saved" }); };
  responses["/admin/lectures/new"] = async (config) => {
    if (config.method === "delete") managed = managed.filter((lesson) => lesson._id !== "new");
    else managed = managed.map((lesson) => lesson._id === "new" ? { ...lesson, title: config.data.get("title") } : lesson);
    return reply(config, { message: config.method === "delete" ? "Lesson deleted" : "Lesson updated" });
  };
  const change = async (name, value) => { await act(async () => { renderer.root.findAll((node) => ["input", "textarea"].includes(node.type) && node.props.name === name)[0].props.onChange({ target: { value } }); }); };
  const submit = async () => { await act(async () => { await renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }); await flush(); }); };
  await mount("/admin", true); await click("Edit"); await change("title", "Updated course"); await submit(); assert.match(page(), /Course updated/);
  await click("Manage Lessons"); await click("Add Lesson"); await change("title", "New written"); await change("content", "Text for learners"); await change("durationMinutes", "3"); await submit(); assert.match(page(), /Lesson created/);
  await click("Move Down"); assert.equal(managed[0]._id, "first");
  const row = () => renderer.root.findAllByType("li").find((node) => text(node).includes("New written"));
  await act(async () => { row().findAllByType("button").find((b) => text(b) === "Edit").props.onClick(); }); await change("title", "Revised written"); await submit(); assert.match(page(), /Lesson updated/);
  const item = renderer.root.findAllByType("li").find((node) => text(node).includes("Revised written"));
  globalThis.window = { confirm: () => true };
  try { await act(async () => { await item.findAllByType("button").find((b) => text(b) === "Delete").props.onClick(); await flush(); }); }
  finally { delete globalThis.window; }
  assert.match(page(), /Lesson deleted/); assert.ok(!managed.some((lesson) => lesson._id === "new"));
});
