import { useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext.jsx";
import { mediaUrl } from "../api.js";
import "./CourseCard.css";

// One course tile shown on the Courses page.
export default function CourseCard({ course }) {
  const navigate = useNavigate();
  const { isAuth, user } = UserData();

  const enrolled = user?.subscription?.includes(course._id);
  const isAdmin = user?.role === "admin";

  // Decide where the main button takes you.
  function handleClick() {
    if (!isAuth) return navigate("/login");
    if (enrolled || isAdmin) return navigate(`/course/study/${course._id}`);
    navigate(`/course/${course._id}`);
  }

  return (
    <div className="course-card">
      <img src={mediaUrl(course.image)} alt={course.title} className="course-image" />
      <h3>{course.title}</h3>
      <p>Instructor: {course.createdBy}</p>
      <p>Duration: {course.duration} weeks</p>
      <p className="price">{course.price === 0 ? "Free" : `₹${course.price}`}</p>

      <button onClick={handleClick} className="common-btn">
        {enrolled || isAdmin ? "Start Learning" : "Get Started"}
      </button>
    </div>
  );
}
