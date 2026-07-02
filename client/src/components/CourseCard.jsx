import { useNavigate } from "react-router-dom";
import { FiUser, FiClock, FiArrowRight } from "react-icons/fi";
import { UserData } from "../context/UserContext.jsx";
import { thumbUrl } from "../api.js";
import "./CourseCard.css";

// One course tile shown on the Courses page.
// `progress` (optional): { percentage, completed, total } — shows a mini bar (Account page).
export default function CourseCard({ course, progress }) {
  const navigate = useNavigate();
  const { isAuth, user } = UserData();

  const enrolled = user?.subscription?.includes(course._id);
  const isAdmin = user?.role === "admin";
  const isFree = course.price === 0;

  // Decide where the main button takes you.
  function handleClick() {
    if (!isAuth) return navigate("/login");
    if (enrolled || isAdmin) return navigate(`/course/study/${course._id}`);
    navigate(`/course/${course._id}`);
  }

  return (
    <div className="course-card">
      <div className="course-media">
        <img
          src={thumbUrl(course.image)}
          alt={course.title}
          className="course-image"
          loading="lazy"
        />
        {course.category && <span className="badge badge-cat">{course.category}</span>}
        <span className={`badge badge-price ${isFree ? "is-free" : ""}`}>
          {isFree ? "Free" : `₹${course.price}`}
        </span>
        {enrolled && <span className="badge badge-enrolled">Enrolled</span>}
      </div>

      <div className="course-body">
        <h3>{course.title}</h3>
        <div className="course-meta">
          <span>
            <FiUser aria-hidden /> {course.createdBy}
          </span>
          <span>
            <FiClock aria-hidden /> {course.duration} weeks
          </span>
        </div>

        {progress && (
          <div className="card-progress">
            <div className="card-progress-head">
              <span>{progress.completed}/{progress.total} lessons</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="card-progress-track">
              <div
                className="card-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        <button onClick={handleClick} className="common-btn card-btn">
          {progress
            ? progress.percentage >= 100
              ? "Review Course ✓"
              : progress.percentage > 0
                ? "Continue Learning"
                : "Start Learning"
            : enrolled || isAdmin
              ? "Start Learning"
              : "Get Started"}
          <FiArrowRight aria-hidden />
        </button>
      </div>
    </div>
  );
}
