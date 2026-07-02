import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiArrowRight, FiPlay } from "react-icons/fi";
import api from "../api.js";
import { CourseData } from "../context/CourseContext.jsx";
import { UserData } from "../context/UserContext.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Testimonials from "../components/Testimonials.jsx";
import banner from "../assets/banner-1.jpg";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { courses } = CourseData();
  const { isAuth } = UserData();
  const [resume, setResume] = useState(null); // { course, percentage } — first unfinished course

  // Find the first enrolled-but-unfinished course to offer a "continue" shortcut.
  useEffect(() => {
    if (!isAuth) return setResume(null);
    Promise.all([api.get("/courses/mine"), api.get("/courses/mine/progress")])
      .then(([coursesRes, progressRes]) => {
        const prog = progressRes.data.progress;
        const next = coursesRes.data.courses.find((c) => (prog[c._id]?.percentage ?? 0) < 100);
        setResume(next ? { course: next, ...prog[next._id] } : null);
      })
      .catch(() => setResume(null));
  }, [isAuth]);

  return (
    <div>
      {/* Hero */}
      <section className="hero" style={{ backgroundImage: `url(${banner})` }}>
        <div className="hero-content">
          <span className="hero-eyebrow">🧘 Online Yoga Studio</span>
          <h1>
            Find Your Balance,<br />
            <span className="hero-accent">One Breath at a Time</span>
          </h1>
          <p>Guided video courses in mindfulness and strength — practice anywhere, at your own pace.</p>
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
          <h3>Expert Instructors</h3>
          <p>Learn from certified teachers who guide you step by step.</p>
        </div>
        <div className="feature">
          <span>🎥</span>
          <h3>Video Lessons</h3>
          <p>Follow along with clear, on-demand video sessions any time.</p>
        </div>
        <div className="feature">
          <span>📈</span>
          <h3>Track Progress</h3>
          <p>Complete lectures and watch your progress grow.</p>
        </div>
      </section>

      {/* Continue watching — pulls returning learners straight back in */}
      {resume && (
        <section className="resume-band">
          <div className="resume-info">
            <span className="resume-label">Continue where you left off</span>
            <h3>{resume.course.title}</h3>
            <span className="resume-meta">
              {resume.completed}/{resume.total} lessons · {resume.percentage}% complete
            </span>
          </div>
          <button
            className="common-btn"
            onClick={() => navigate(`/course/study/${resume.course._id}`)}
          >
            <FiPlay aria-hidden /> Resume
          </button>
        </section>
      )}

      {/* Featured courses (first three) */}
      {courses.length > 0 && (
        <section className="featured" id="featured">
          <h2 className="section-title">Featured Courses</h2>
          <p className="section-sub">Hand-picked practices to get you started today.</p>
          <div className="course-grid">
            {courses.slice(0, 3).map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>
        </section>
      )}

      {/* Engagement CTA band */}
      <section className="cta-band">
        <h2>Ready to roll out your mat?</h2>
        <p>Join YogaBliss free and start your first guided session in minutes.</p>
        <button onClick={() => navigate("/register")} className="common-btn accent-btn">
          Create your free account <FiArrowRight aria-hidden />
        </button>
      </section>

      <Testimonials />
    </div>
  );
}
