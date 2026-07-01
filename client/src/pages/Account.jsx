import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import { UserData } from "../context/UserContext.jsx";
import CourseCard from "../components/CourseCard.jsx";

export default function Account() {
  const { user, logout } = UserData();
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);

  useEffect(() => {
    api.get("/courses/mine").then(({ data }) => setMyCourses(data.courses));
  }, []);

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
      <div className="course-grid">
        {myCourses.length > 0 ? (
          myCourses.map((c) => <CourseCard key={c._id} course={c} />)
        ) : (
          <p style={{ color: "#666" }}>You haven't enrolled in any courses yet.</p>
        )}
      </div>
    </div>
  );
}
