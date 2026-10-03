import { Link } from "react-router-dom";
import { FiUser, FiClock, FiArrowRight } from "react-icons/fi";
import { UserData } from "../context/UserContext.jsx";
import { thumbUrl } from "../api.js";
import { courseDuration } from "../utils/coursePresentation.js";
import ProgressBar from "./ProgressBar.jsx";
import "./CourseCard.css";

// One course tile shown on the Courses page.
// `progress` (optional): { percentage, completed, total } — shows a mini bar (Account page).
export default function CourseCard({ course, progress }) {
  const { user } = UserData();

  const enrolled = user?.subscription?.includes(course._id);
  const isAdmin = user?.role === "admin";

  const canStudy = enrolled || isAdmin;

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
        <span className="badge badge-price is-free">Free</span>
        {enrolled && <span className="badge badge-enrolled">Enrolled</span>}
      </div>

      <div className="course-body">
        <h3><Link to={`/course/${course._id}`}>{course.title}</Link></h3>
        {course.level && <p className="course-level">{course.level}</p>}
        <div className="course-meta">
          <span>
            <FiUser aria-hidden /> {course.createdBy}
          </span>
          <span>
            <FiClock aria-hidden /> {courseDuration(course)}
          </span>
        </div>

        {progress && (
          <div className="card-progress">
            <ProgressBar completed={progress.completed} total={progress.total} label={`${course.title} progress`} />
          </div>
        )}

        <Link to={canStudy ? `/course/study/${course._id}` : `/course/${course._id}`} className="common-btn card-btn">
          {progress
            ? progress.percentage >= 100
              ? "Review Course ✓"
              : progress.percentage > 0
                ? "Continue Learning"
                : "Start Learning"
            : enrolled || isAdmin
              ? "Open Course"
              : "View Course"}
          <FiArrowRight aria-hidden />
        </Link>
      </div>
    </div>
  );
}
