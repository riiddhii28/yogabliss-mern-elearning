import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { mediaUrl } from "../api.js";
import { UserData } from "../context/UserContext.jsx";
import useResource from "../hooks/useResource.js";
import { studySummary } from "../utils/study.js";
import { authLink } from "../utils/navigation.js";
import Loading from "../components/Loading.jsx";
import ContentState, { CoursesLink } from "../components/ContentState.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import "./CourseStudy.css";

export default function CourseStudy() {
  const { id } = useParams();
  const load = useCallback(async (signal) => {
    const courseRes = await api.get(`/courses/${id}`, { signal });
    const [lessonsRes, progressRes] = await Promise.all([
      api.get(`/courses/${id}/lectures`, { signal }),
      api.get(`/courses/${id}/progress`, { signal }),
    ]);
    return { course: courseRes.data.course, lessons: lessonsRes.data.lectures, progress: progressRes.data };
  }, [id]);
  const { data, loading, error, retry } = useResource(load);
  if (loading) return <Loading message="Opening your course…" />;
  if (error) {
    const status = error.response?.status;
    if (status === 403) return <ContentState title="Enroll to open these lessons" message="View the course and enroll for free to start learning."><Link className="common-btn" to={`/course/${id}`}>View Course</Link><CoursesLink /></ContentState>;
    if (status === 401) return <ContentState title="Please log in again" error><Link className="common-btn" to={authLink("/login", `/course/study/${id}`)}>Login</Link></ContentState>;
    const missing = [400, 404].includes(status);
    return <ContentState title={missing ? "Course not found" : "Couldn't open your course"} message={missing ? "This course may have been removed." : "Check your connection and retry."} error onRetry={missing ? undefined : retry}><CoursesLink /></ContentState>;
  }
  return <StudyLessons {...data} />;
}

function StudyLessons({ course, lessons, progress: initialProgress }) {
  const { user } = UserData();
  const [progress, setProgress] = useState(initialProgress);
  const [activeId, setActiveId] = useState(() => studySummary(lessons, initialProgress.completedLectures).firstUnfinished);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [videoError, setVideoError] = useState(false);
  const [videoAttempt, setVideoAttempt] = useState(0);
  const requestRef = useRef(null);
  const progressRef = useRef(progress);
  const headingRef = useRef(null);
  const summary = studySummary(lessons, progress.completedLectures);
  const activeIndex = lessons.findIndex((lesson) => lesson._id === activeId);
  const active = lessons[activeIndex];
  const done = active && progress.completedLectures.includes(active._id);
  const preview = user?.role === "admin" && !user.subscription?.includes(course._id);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [activeId]);

  function selectLesson(index) {
    if (requestRef.current || !lessons[index]) return;
    setActiveId(lessons[index]._id);
    setReviewing(true);
    setSaveError("");
    setNotice("");
    setVideoError(false);
  }

  async function markComplete(lectureId) {
    if (preview || requestRef.current || progressRef.current.completedLectures.includes(lectureId)) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      const { data } = await api.post(`/courses/${course._id}/progress`, { lectureId }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      progressRef.current = data;
      setProgress(data);
      setNotice("Lesson complete. Progress saved.");
      if (studySummary(lessons, data.completedLectures).complete) {
        setReviewing(false);
        setActiveId(null);
      }
    } catch (error) {
      if (!controller.signal.aborted) setSaveError(error.response?.data?.error || "Couldn't save completion. Please retry.");
    } finally {
      if (!controller.signal.aborted) { requestRef.current = null; setSaving(false); }
    }
  }

  return (
    <div className="page">
      <Link className="text-link back-link" to={`/course/${course._id}`}>← Course details</Link>
      <h1 className="study-course-title">{course.title}</h1>
      {preview && <p className="lesson-format">Admin preview · Completion tracking is available to enrolled learners.</p>}
      <div className="progress-wrap"><ProgressBar completed={summary.completed} total={summary.total} /></div>
      {notice && <p className="save-notice" role="status">{notice}</p>}
      {!lessons.length ? (
        <ContentState title="No lessons available yet" message="This course's lessons haven't been added yet."><CoursesLink /></ContentState>
      ) : summary.complete && !reviewing ? (
        <ContentState title="Course complete" message={`You completed all ${summary.total} lessons.`}>
          <button className="common-btn" onClick={() => selectLesson(0)}>Review course</button>
          <Link className="text-link" to="/account">Back to My Courses</Link>
          <Link className="text-link" to="/courses">Browse Courses</Link>
        </ContentState>
      ) : (
        <div className="study">
          <div className="player">
            {active && <>
              <p className="lesson-format">Lesson {activeIndex + 1} of {lessons.length} · {active.video ? "Video lesson" : "Written lesson"}
                {active.durationMinutes ? ` · About ${active.durationMinutes} min` : ""}</p>
              <h2 ref={headingRef} tabIndex={-1}>{active.title}</h2>
              <p className="lec-desc">{active.description}</p>
              {active.video ? <>
                <video key={`${active._id}-${videoAttempt}`} src={mediaUrl(active.video)} controls preload="metadata" playsInline className="video"
                  aria-label={active.title} onError={() => setVideoError(true)}
                  onEnded={() => markComplete(active._id)} />
                {videoError && <ContentState title="Video couldn't load" message="Check your connection and retry the video." error onRetry={() => { setVideoError(false); setVideoAttempt((n) => n + 1); }} />}
              </> : <p className="lesson-format">Read the lesson below, then mark it complete. No video is included.</p>}
              {active.content && <div className="lesson-content">{active.content.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
              {saveError && <p className="inline-error" role="alert">{saveError} Your completion hasn't been confirmed.</p>}
              {!preview && <button className="common-btn" disabled={done || saving || (!active.video && !active.content)} onClick={() => markComplete(active._id)}>
                {saving ? "Saving…" : done ? "Completed ✓" : saveError ? "Retry saving completion" : "Mark Complete"}
              </button>}
              <nav className="lesson-navigation" aria-label="Lesson navigation">
                <button className="common-btn secondary" disabled={saving || activeIndex === 0} onClick={() => selectLesson(activeIndex - 1)}>Previous Lesson</button>
                <button className="common-btn secondary" disabled={saving || activeIndex === lessons.length - 1} onClick={() => selectLesson(activeIndex + 1)}>Next Lesson</button>
              </nav>
              {summary.complete && <button className="text-link" onClick={() => setReviewing(false)}>View course completion</button>}
            </>}
          </div>
          <aside className="lecture-list" aria-label="Course curriculum">
            <h2>Lessons</h2>
            {lessons.map((lesson, index) => {
              const completed = progress.completedLectures.includes(lesson._id);
              return <button key={lesson._id} className={`lecture-item ${activeId === lesson._id ? "current" : ""}`}
                aria-current={activeId === lesson._id ? "step" : undefined} disabled={saving} onClick={() => selectLesson(index)}>
                <span className="num" aria-hidden="true">{index + 1}</span>
                <span className="lec-title">{lesson.title}{completed && <span className="lesson-completed">Completed ✓</span>}</span>
              </button>;
            })}
          </aside>
        </div>
      )}
    </div>
  );
}
