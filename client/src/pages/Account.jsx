import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import { UserData } from "../context/UserContext.jsx";
import CourseCard from "../components/CourseCard.jsx";
import useResource from "../hooks/useResource.js";
import Loading from "../components/Loading.jsx";
import ContentState from "../components/ContentState.jsx";

export default function Account() {
  const { user, logout } = UserData();
  const navigate = useNavigate();
  const load = useCallback(async (signal) => {
    const [coursesRes, progressRes] = await Promise.all([
      api.get("/courses/mine", { signal }), api.get("/courses/mine/progress", { signal }),
    ]);
    return { courses: coursesRes.data.courses, progress: progressRes.data.progress };
  }, [user.id]);
  const { data, loading, error, retry } = useResource(load);
  const myCourses = data?.courses || [];
  const progress = data?.progress || {};

  return (
    <div className="page">
      <h2 className="section-title">My Account</h2>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <p style={{ fontSize: 18 }}>
          <strong>{user.name}</strong>
        </p>
        <p style={{ color: "#666" }}>{user.email}</p>
        <p style={{ color: "#666", marginBottom: 16 }}>Role: {user.role}</p>
        <button className="common-btn danger" onClick={() => logout(navigate)}>
          Logout
        </button>
      </div>

      <h3 style={{ color: "#145a32", textAlign: "center", marginBottom: 24 }}>
        My Courses
      </h3>
      {loading ? <Loading message="Loading your courses…" /> : error ? (
        <ContentState title="Couldn't load your courses" message="Your enrollments haven't been changed. Please retry." error onRetry={retry} />
      ) : <div className="course-grid">
        {myCourses.length > 0 ? (
          myCourses.map((c) => (
            <CourseCard key={c._id} course={c} progress={progress[c._id]} />
          ))
        ) : (
          <ContentState title="Your learning starts here" message="You haven't enrolled in any courses yet."><Link className="common-btn" to="/courses">Browse Courses</Link></ContentState>
        )}
      </div>}
    </div>
  );
}
