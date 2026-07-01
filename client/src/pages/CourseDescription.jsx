import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { mediaUrl } from "../api.js";
import { UserData } from "../context/UserContext.jsx";
import Loading from "../components/Loading.jsx";
import "./CourseDescription.css";

export default function CourseDescription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = UserData();

  const [course, setCourse] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    api.get(`/courses/${id}`).then(({ data }) => setCourse(data.course));
  }, [id]);

  const enrolled = user?.subscription?.includes(id);

  async function handleEnroll() {
    setEnrolling(true);
    try {
      await api.post(`/courses/${id}/enroll`);
      await refreshUser(); // so the button flips to "Study"
      toast.success("You're enrolled! Enjoy the course.");
      navigate(`/course/study/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not enroll");
    } finally {
      setEnrolling(false);
    }
  }

  if (!course) return <Loading />;

  return (
    <div className="page">
      <div className="course-description">
        <img src={mediaUrl(course.image)} alt={course.title} className="cd-image" />
        <div className="cd-body">
          <h2>{course.title}</h2>
          <p className="cd-meta">
            Instructor: {course.createdBy} · {course.duration} weeks ·{" "}
            {course.price === 0 ? "Free" : `₹${course.price}`}
          </p>
          <p className="cd-desc">{course.description}</p>

          {enrolled ? (
            <button className="common-btn" onClick={() => navigate(`/course/study/${id}`)}>
              Go to Course
            </button>
          ) : (
            <button className="common-btn" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? "Enrolling…" : "Enroll for Free"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
