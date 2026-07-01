import { CourseData } from "../context/CourseContext.jsx";
import CourseCard from "../components/CourseCard.jsx";

export default function Courses() {
  const { courses } = CourseData();

  return (
    <div className="page">
      <h2 className="section-title">Available Courses</h2>
      <div className="course-grid">
        {courses.length > 0 ? (
          courses.map((c) => <CourseCard key={c._id} course={c} />)
        ) : (
          <p style={{ textAlign: "center", color: "#666" }}>No courses yet.</p>
        )}
      </div>
    </div>
  );
}
