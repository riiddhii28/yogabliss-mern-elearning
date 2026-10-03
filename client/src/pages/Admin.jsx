import { useCallback, useRef, useState } from "react";
import api, { thumbUrl } from "../api.js";
import { CourseData } from "../context/CourseContext.jsx";
import useResource from "../hooks/useResource.js";
import Loading from "../components/Loading.jsx";
import ContentState from "../components/ContentState.jsx";
import { CourseEditor } from "../components/admin/Editors.jsx";
import LessonManager from "../components/admin/LessonManager.jsx";
import { courseDuration } from "../utils/coursePresentation.js";
import "./Admin.css";

export default function Admin() {
  const { fetchCourses } = CourseData();
  const load = useCallback(async (signal) => {
    const [courses, stats, users] = await Promise.all([api.get("/admin/courses", { signal }), api.get("/admin/stats", { signal }), api.get("/admin/users", { signal })]);
    return { courses: courses.data.courses, stats: stats.data.stats, users: users.data.users };
  }, []);
  const { data, loading, error, retry } = useResource(load);
  const [section, setSection] = useState("courses");
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [upload, setUpload] = useState(null);
  const uploadConfig = { timeout: 120000, onUploadProgress: (event) => setUpload(event.total ? Math.round(event.loaded / event.total * 100) : null) };
  async function run(task) {
    if (pending.current) return null;
    pending.current = true; setBusy(true); setFailure(""); setNotice(""); setUpload(null);
    try {
      const response = await task();
      setNotice([response.data.message, response.data.warning].filter(Boolean).join(" "));
      fetchCourses();
      return response.data;
    } catch (err) {
      setFailure(err.response?.data?.error || "Request could not be confirmed. Reload before retrying to check whether it saved.");
      return null;
    } finally { pending.current = false; setBusy(false); setUpload(null); }
  }
  async function saveCourse(form) {
    if (await run(() => editing._id ? api.put(`/admin/courses/${editing._id}`, form, uploadConfig) : api.post("/admin/courses", form, uploadConfig))) { setEditing(null); retry(); }
  }
  async function removeCourse(course) {
    if (!window.confirm(`Delete “${course.title}” and all its lessons? Enrollments and progress will also be removed.`)) return;
    if (await run(() => api.delete(`/admin/courses/${course._id}`))) retry();
  }
  function changeSection(next) { setSection(next); setEditing(null); setSelected(null); retry(); }
  return <div className="page admin">
    <h1 className="section-title">Admin Dashboard</h1>
    <nav className="admin-actions" aria-label="Admin sections">{["overview", "courses", "users"].map((name) => <button key={name} className={`common-btn ${section === name ? "" : "secondary"}`} aria-pressed={section === name} disabled={busy} onClick={() => changeSection(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</nav>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {failure && <div className="inline-error" role="alert"><p>{failure}</p><button className="text-link" disabled={busy} onClick={() => { setEditing(null); retry(); }}>Reload data</button></div>}
    {busy && <p role="status">{upload === null ? "Saving changes…" : upload < 100 ? `Uploading… ${upload}%` : "Upload sent. Saving changes…"}</p>}
    {loading ? <Loading message="Loading admin data…" /> : error ? <ContentState title="Couldn't load admin data" message={error.response?.data?.error || "Check your connection and retry."} error onRetry={retry} /> : data && <>
      {section === "overview" && <section aria-label="Overview"><h2 className="admin-sub">Overview</h2><div className="stat-row">{[["Courses", data.stats.totalCourses], ["Lessons", data.stats.totalLectures], ["Users", data.stats.totalUsers]].map(([label, count]) => <div className="stat-card" key={label}><span>{count}</span>{label}</div>)}</div></section>}
      {section === "courses" && (selected ? <LessonManager key={selected._id} course={selected} busy={busy} run={run} uploadConfig={uploadConfig} onBack={() => { setSelected(null); retry(); }} /> : <section aria-label="Course management">
        <h2 className="admin-sub">Courses</h2>
        {editing ? <CourseEditor key={editing._id || "new"} course={editing._id ? editing : null} busy={busy} onSave={saveCourse} onCancel={() => setEditing(null)} /> : <>
          <button className="common-btn" disabled={busy} onClick={() => setEditing({})}>Create Course</button>
          {!data.courses.length && <ContentState title="No courses yet" message="Create your first course to get started." />}
          <ul className="admin-list">{data.courses.map((course) => <li key={course._id} className="admin-item">
            <img className="admin-cover" src={thumbUrl(course.image, 240)} alt={`${course.title} cover`} />
            <div className="admin-item-body"><h3>{course.title}</h3><p>{course.level || "Level not set"} · {course.category} · {courseDuration(course)} · Free</p><p>{course.lessonCount} lessons</p>{course.deleting && <p role="status">Deletion needs retrying.</p>}</div>
            <div className="admin-actions">{!course.deleting && <><button className="common-btn secondary small" disabled={busy} onClick={() => setEditing(course)}>Edit</button><button className="common-btn secondary small" disabled={busy} onClick={() => setSelected(course)}>Manage Lessons</button></>}<button className="common-btn danger small" disabled={busy} onClick={() => removeCourse(course)}>{course.deleting ? "Retry Delete" : "Delete"}</button></div>
          </li>)}</ul>
        </>}
      </section>)}
      {section === "users" && <section aria-label="Users"><h2 className="admin-sub">Users</h2>{!data.users.length ? <ContentState title="No other users yet" /> : <div className="table-scroll" role="region" aria-label="User list" tabIndex={0}><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>{data.users.map((user) => <tr key={user._id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td></tr>)}</tbody></table></div>}</section>}
    </>}
  </div>;
}
