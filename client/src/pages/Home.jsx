import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiArrowRight, FiPlay } from "react-icons/fi";
import api from "../api.js";
import { CourseData } from "../context/CourseContext.jsx";
import { UserData } from "../context/UserContext.jsx";
import CourseCard from "../components/CourseCard.jsx";
import banner from "../assets/banner-1.jpg";
import useResource from "../hooks/useResource.js";
import ContentState from "../components/ContentState.jsx";
import Loading from "../components/Loading.jsx";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { courses, loading: catalogLoading, error: catalogError, fetchCourses } = CourseData();
  const { isAuth, user } = UserData();
  const loadResume = useCallback(async (signal) => {
    if (!isAuth) return null;
    const [coursesRes, progressRes] = await Promise.all([
      api.get("/courses/mine", { signal }), api.get("/courses/mine/progress", { signal }),
    ]);
    const progress = progressRes.data.progress;
    const next = coursesRes.data.courses.find((course) => progress[course._id]?.total > 0 && progress[course._id].percentage < 100);
    return next ? { course: next, ...progress[next._id] } : null;
  }, [isAuth, user?.id]);
  const { data: resume, loading: resumeLoading, error: resumeError, retry: retryResume } = useResource(loadResume);

  return (
    <div>
      {/* Hero */}
      <section className="hero" style={{ backgroundImage: `url(${banner})` }}>
        <div className="hero-content">
          <span className="hero-eyebrow">🧘 Free Yoga Learning Demo</span>
          <h1>
            Find Your Balance,<br />
            <span className="hero-accent">One Breath at a Time</span>
          </h1>
          <p>Short introductions to yoga and mindfulness, with written lessons to explore at your own pace.</p>
          <div className="hero-actions">
            <button onClick={() => navigate("/courses")} className="common-btn">
              Start Your Journey <FiArrowRight aria-hidden />
            </button>
            <a href="#featured" className="hero-ghost">Browse courses</a>
          </div>
        </div>
        <a href="#featured" className="scroll-cue" aria-label="Scroll down">
          <FiChevronDown />
        </a>
      </section>

      {/* Why us */}
      <section className="features">
        <div className="feature">
          <span>🧘</span>
          <h3>A Clear Starting Point</h3>
          <p>Explore foundational postures, movement, and mindful breathing.</p>
        </div>
        <div className="feature">
          <span>📖</span>
          <h3>Short Written Lessons</h3>
          <p>Read practical notes and reflect at your own pace. Demo courses do not include video instruction.</p>
        </div>
        <div className="feature">
          <span>📈</span>
          <h3>Track Progress</h3>
          <p>Mark lessons complete and see your progress in your account.</p>
        </div>
      </section>

      {/* Resume opens the first unfinished lesson on the study page. */}
      {isAuth && resumeLoading && <Loading message="Loading your learning progress…" />}
      {isAuth && resumeError && <ContentState title="Couldn't load your learning progress" message="You can still browse courses below." error onRetry={retryResume} />}
      {isAuth && resume && (
        <section className="resume-band">
          <div className="resume-info">
            <span className="resume-label">Your learning journey</span>
            <h3>{resume.course.title}</h3>
            <span className="resume-meta">
              {resume.completed}/{resume.total} lessons · {resume.percentage}% complete
            </span>
          </div>
          <button
            className="common-btn"
            onClick={() => navigate(`/course/study/${resume.course._id}`)}
          >
            <FiPlay aria-hidden /> Resume course
          </button>
        </section>
      )}

      {/* A small selection from the current catalog */}
      <section className="featured" id="featured">
          <h2 className="section-title">Explore Our Courses</h2>
          <p className="section-sub">Free, bite-sized introductions to movement and mindfulness.</p>
          {catalogLoading ? <Loading message="Loading courses…" /> : catalogError ? (
            <ContentState title="Couldn't load courses" message="Check your connection and try again." error onRetry={fetchCourses} />
          ) : !courses.length ? <ContentState title="No courses available yet" message="Please check back soon." onRetry={fetchCourses} /> : <div className="course-grid">
            {courses.slice(0, 3).map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>}
      </section>

      {/* Engagement CTA band */}
      <section className="cta-band">
        <h2>Ready to roll out your mat?</h2>
        <p>Join YogaBliss free and explore your first lesson in minutes.</p>
        <button onClick={() => navigate(isAuth ? "/account" : "/register")} className="common-btn accent-btn">
          {isAuth ? "My Courses" : "Create your free account"} <FiArrowRight aria-hidden />
        </button>
      </section>
    </div>
  );
}
