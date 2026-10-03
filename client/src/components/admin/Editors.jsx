import { useEffect, useState } from "react";
import { mediaUrl } from "../../api.js";

export function Field({ label, name, children, multiline, ...props }) {
  const id = `admin-${name}`;
  return <div className="admin-field"><label htmlFor={id}>{label}</label>{children ?
    <select id={id} name={name} {...props}>{children}</select> : multiline ?
      <textarea id={id} name={name} {...props} /> : <input id={id} name={name} {...props} />}</div>;
}

function usePreview(file, existing) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview || mediaUrl(existing);
}

export function CourseEditor({ course, busy, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({
    title: course?.title || "", description: course?.description || "", category: course?.category || "Yoga",
    level: course?.level || "Beginner", createdBy: course?.createdBy || "YogaBliss",
    duration: course?.duration ?? "", durationUnit: course?.durationUnit || "minutes",
    learningOutcomes: (course?.learningOutcomes || []).join("\n"),
  }));
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const preview = usePreview(file, course?.image);
  const field = (name) => ({ name, value: values[name], onChange: (event) => setValues({ ...values, [name]: event.target.value }) });
  async function submit(event) {
    event.preventDefault(); setError("");
    const outcomes = values.learningOutcomes.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!outcomes.length || outcomes.length > 20 || outcomes.some((line) => line.length > 400)) return setError("Enter 1–20 learning outcomes, each at most 400 characters.");
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) return setError("Choose a JPEG, PNG or WebP image up to 5 MiB.");
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.set(key, key === "learningOutcomes" ? JSON.stringify(outcomes) : value));
    if (file) form.set("file", file);
    await onSave(form);
  }
  return <form className="admin-form" onSubmit={submit}>
    <h3>{course ? `Edit ${course.title}` : "Create Course"}</h3>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <fieldset disabled={busy}>
      <Field label="Title" {...field("title")} required maxLength={160} />
      <Field label="Description" {...field("description")} multiline required maxLength={10000} rows={4} />
      <Field label="Level" {...field("level")} required maxLength={80} />
      <Field label="Category / type" {...field("category")} required maxLength={80} />
      <Field label="Instructor" {...field("createdBy")} required maxLength={120} />
      {course?.durationUnit === "weeks" && <><p>This older course uses weeks. Keep its unit or enter a new estimate in minutes.</p><Field label="Duration unit" {...field("durationUnit")}><option value="weeks">Weeks (existing course)</option><option value="minutes">Minutes</option></Field></>}
      <Field label={`Duration (${values.durationUnit})`} {...field("duration")} type="number" min={1} max={100000} step={1} required />
      <Field label="Learning outcomes — one per line" {...field("learningOutcomes")} multiline required rows={5} maxLength={8020} />
      <Field label={course ? "Replace cover (optional)" : "Cover image"} name="cover" type="file" accept="image/jpeg,image/png,image/webp" required={!course} onChange={(event) => setFile(event.target.files[0] || null)} />
      <p>JPEG, PNG or WebP · Maximum 5 MiB. All courses are free.</p>
      {preview && <img className="admin-preview" src={preview} alt="Course cover preview" />}
      <div className="admin-actions"><button className="common-btn" disabled={busy}>{busy ? "Saving…" : "Save Course"}</button><button type="button" className="common-btn secondary" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}

export function LessonEditor({ lesson, count, busy, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({ title: lesson?.title || "", description: lesson?.description || "",
    content: lesson?.content || "", durationMinutes: lesson?.durationMinutes ?? "", order: lesson?.order || count + 1,
    type: lesson ? (lesson.video ? "video" : "written") : "written" }));
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const field = (name) => ({ name, value: values[name], onChange: (event) => setValues({ ...values, [name]: event.target.value }) });
  async function submit(event) {
    event.preventDefault(); setError("");
    if (file && (!['video/mp4', 'video/webm'].includes(file.type) || file.size > 25 * 1024 * 1024)) return setError("Choose an MP4 or WebM video up to 25 MiB.");
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.set(key, value));
    if (values.type === "video" && file) form.set("file", file);
    await onSave(form);
  }
  return <form className="admin-form" onSubmit={submit}>
    <h3>{lesson ? `Edit ${lesson.title}` : "Add Lesson"}</h3>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <fieldset disabled={busy}>
      {lesson ? <p>Type: {values.type === "video" ? "Video" : "Written"}</p> : <Field label="Lesson type" {...field("type")}><option value="written">Written</option><option value="video">Video</option></Field>}
      <Field label="Title" {...field("title")} required maxLength={160} />
      <Field label="Description" {...field("description")} multiline maxLength={10000} rows={3} />
      {values.type === "written" ? <Field label="Written content" {...field("content")} multiline required rows={12} maxLength={60000} /> : <>
        {lesson?.video && <p>Current video is retained unless you select a replacement. <a className="text-link" href={mediaUrl(lesson.video)} target="_blank" rel="noreferrer">Open current video</a></p>}
        <Field label={lesson ? "Replace video (optional)" : "Video file"} name="video" type="file" accept="video/mp4,video/webm" required={!lesson} onChange={(event) => setFile(event.target.files[0] || null)} />
        <p>MP4 or WebM · Maximum 25 MiB.</p>
      </>}
      <Field label="Estimated duration (minutes)" {...field("durationMinutes")} type="number" required min={1} max={100000} step={1} />
      <Field label="Position in course" {...field("order")} type="number" required min={1} max={Math.max(1, count + (lesson ? 0 : 1))} step={1} />
      <div className="admin-actions"><button className="common-btn" disabled={busy}>{busy ? "Saving…" : "Save Lesson"}</button><button type="button" className="common-btn secondary" onClick={onCancel}>Cancel</button></div>
    </fieldset>
  </form>;
}
