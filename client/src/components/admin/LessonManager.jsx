import { useCallback, useState } from "react";
import api from "../../api.js";
import useResource from "../../hooks/useResource.js";
import Loading from "../Loading.jsx";
import ContentState from "../ContentState.jsx";
import { LessonEditor } from "./Editors.jsx";

export default function LessonManager({ course, busy, run, uploadConfig, onBack }) {
  const load = useCallback(async (signal) => (await api.get(`/admin/courses/${course._id}/lectures`, { signal })).data, [course._id]);
  const { data, loading, error, retry } = useResource(load);
  const [editing, setEditing] = useState(null);
  const lessons = data?.lectures || [];
  const active = lessons.filter((lesson) => !lesson.deleting);
  async function save(form) {
    const result = await run(() => editing._id ? api.put(`/admin/lectures/${editing._id}`, form, uploadConfig) : api.post(`/admin/courses/${course._id}/lectures`, form, uploadConfig));
    if (result) { setEditing(null); retry(); }
  }
  async function move(index, direction) {
    const ids = active.map((lesson) => lesson._id);
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    if (await run(() => api.put(`/admin/courses/${course._id}/lectures/order`, { lessonIds: ids }))) retry();
  }
  async function remove(lesson) {
    if (!window.confirm(`Delete “${lesson.title}” from “${course.title}”? Saved completion references will also be removed.`)) return;
    if (await run(() => api.delete(`/admin/lectures/${lesson._id}`))) { setEditing(null); retry(); }
  }
  return <section aria-labelledby="manage-lessons-title">
    <button className="text-link" disabled={busy} onClick={onBack}>← Back to Courses</button>
    <h2 id="manage-lessons-title" className="admin-sub">Lessons · {course.title}</h2>
    {loading ? <Loading message="Loading lessons…" /> : error ? <ContentState title="Couldn't load lessons" message={error.response?.data?.error || "Please retry."} error onRetry={retry} /> : <>
      {editing ? <LessonEditor key={editing._id || "new"} lesson={editing._id ? editing : null} count={active.length} busy={busy} onSave={save} onCancel={() => setEditing(null)} /> : <>
        <button className="common-btn" disabled={busy} onClick={() => setEditing({})}>Add Lesson</button>
        {!lessons.length && <ContentState title="No lessons yet" message="Add a written or video lesson to get started." />}
        <ol className="admin-list">
          {lessons.map((lesson) => {
            const index = active.findIndex((item) => item._id === lesson._id);
            return <li key={lesson._id} className="admin-item">
              <div><h3>{lesson.order ? `${lesson.order}. ` : ""}{lesson.title}</h3><p>{lesson.video ? "Video" : "Written"} · {lesson.durationMinutes ? `${lesson.durationMinutes} min` : "Duration not set"}</p>{lesson.deleting && <p role="status">Deletion needs retrying.</p>}</div>
              <div className="admin-actions">
                {!lesson.deleting && <><button className="common-btn secondary small" disabled={busy} onClick={() => setEditing(lesson)}>Edit</button><button className="common-btn secondary small" aria-label={`Move ${lesson.title} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}>Move Up</button><button className="common-btn secondary small" aria-label={`Move ${lesson.title} down`} disabled={busy || index === active.length - 1} onClick={() => move(index, 1)}>Move Down</button></>}
                <button className="common-btn danger small" disabled={busy} onClick={() => remove(lesson)}>{lesson.deleting ? "Retry Delete" : "Delete"}</button>
              </div>
            </li>;
          })}
        </ol>
      </>}
    </>}
  </section>;
}
