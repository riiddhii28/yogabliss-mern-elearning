import { useCallback, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { thumbUrl } from "../api.js";
import { UserData } from "../context/UserContext.jsx";
import Loading from "../components/Loading.jsx";
import { courseDuration } from "../utils/coursePresentation.js";
import useResource from "../hooks/useResource.js";
import ContentState, { CoursesLink } from "../components/ContentState.jsx";
import { authLink } from "../utils/navigation.js";
import "./CourseDescription.css";

export default function CourseDescription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuth, refreshUser, loading: sessionLoading, authError, retrySession } = UserData();

  const load = useCallback(async (signal) => (await api.get(`/courses/${id}`, { signal })).data, [id]);
  const { data, loading, error, retry } = useResource(load);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const enrollingRef = useRef(false);
  const course = data?.course;
  const curriculum = data?.curriculum || [];
  const enrolled = user?.subscription?.includes(id);
  const canStudy = enrolled || user?.role === "admin";

  async function handleEnroll() {
    if (!isAuth) return navigate(authLink("/login", `/course/${id}`));
    if (enrollingRef.current) return;
    enrollingRef.current = true;
    setEnrolling(true);
    setEnrollError("");
    try {
      await api.post(`/courses/${id}/enroll`);
      try { await refreshUser(); }
      catch (err) {
        if (err.response?.status === 401) return navigate(authLink("/login", `/course/${id}`));
        toast("Enrolled. Your account details will refresh when you reconnect.");
      }
      toast.success("You're enrolled!");
      navigate(`/course/study/${id}`);
    } catch (err) {
      if (err.response?.status === 401) navigate(authLink("/login", `/course/${id}`));
      else setEnrollError(err.response?.data?.error || "Couldn't enroll. Please try again.");
    } finally {
      enrollingRef.current = false;
      setEnrolling(false);
    }
  }

  if (loading) return <Loading message="Loading course…" />;
  if (error || !course) {
    const missing = [400, 404].includes(error?.response?.status) || (!error && !course);
    return <ContentState title={missing ? "Course not found" : "Couldn't load this course"}
      message={missing ? "This course may have been removed." : "Check your connection and try again."}
      error onRetry={missing ? undefined : retry}><CoursesLink /></ContentState>;
  }

  return (
    <div className="page">
      <Link className="text-link back-link" to="/courses">← Back to Courses</Link>
      <div className="course-description">
        <img src={thumbUrl(course.image, 900)} alt={course.title} className="cd-image" />
        <div className="cd-body">
          <h2>{course.title}</h2>
          <p className="cd-meta">
            By {course.createdBy} · {courseDuration(course)} · Free
          </p>
          {course.level && <p className="cd-meta">{course.category} · {course.level}</p>}
          <p className="cd-desc">{course.description}</p>
          {curriculum.length > 0 && curriculum.every((lesson) => !lesson.hasVideo) && (
            <p className="cd-note">
              {curriculum.length} written lessons · Times include reading and optional practice.
              Video instruction is not included in this demo.
            </p>
          )}

          {enrollError && <p className="inline-error" role="alert">{enrollError}</p>}
          {authError ? (
            <ContentState title="Check your session to enroll" message={authError} error onRetry={retrySession} />
          ) : canStudy ? (
            <button className="common-btn" onClick={() => navigate(`/course/study/${id}`)}>
              Go to Course
            </button>
          ) : (
            <button className="common-btn" onClick={handleEnroll} disabled={enrolling || sessionLoading}>
              {sessionLoading ? "Checking session…" : enrolling ? "Enrolling…" : "Enroll for Free"}
            </button>
          )}
        </div>
      </div>
      {course.learningOutcomes?.length > 0 && (
        <section className="course-outline" aria-labelledby="learning-outcomes">
          <h3 id="learning-outcomes">What you'll learn</h3>
          <ul>
            {course.learningOutcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
          </ul>
        </section>
      )}
      {curriculum.length > 0 && (
        <section className="course-outline" aria-labelledby="course-curriculum">
          <h3 id="course-curriculum">Course curriculum</h3>
          <ol>
            {curriculum.map((lesson) => (
              <li key={lesson.id}>
                <strong>{lesson.title}</strong>
                <span className="curriculum-meta">
                  {lesson.hasVideo ? "Video lesson" : "Written lesson"}
                  {lesson.durationMinutes ? ` · About ${lesson.durationMinutes} min` : ""}
                </span>
                <p>{lesson.description}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
