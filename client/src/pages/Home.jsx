import { useNavigate } from "react-router-dom";
import { CourseData } from "../context/CourseContext.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Testimonials from "../components/Testimonials.jsx";
import banner from "../assets/banner-1.jpg";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { courses } = CourseData();

  return (
    <div>
      {/* Hero */}
      <section className="hero" style={{ backgroundImage: `url(${banner})` }}>
        <div className="hero-content">
          <h1>Welcome to YogaBliss: Your Pathway to Inner Peace and Wellness</h1>
          <p>Join a journey of mindfulness and strength, and unleash your inner calm.</p>
          <button onClick={() => navigate("/courses")} className="common-btn">
            Start Your Journey
          </button>
        </div>
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

      {/* Featured courses (first three) */}
      {courses.length > 0 && (
        <section className="page">
          <h2 className="section-title">Featured Courses</h2>
          <div className="course-grid">
            {courses.slice(0, 3).map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>
        </section>
      )}

      <Testimonials />
    </div>
  );
}
