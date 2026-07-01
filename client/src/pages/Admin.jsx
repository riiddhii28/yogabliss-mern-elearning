import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api.js";
import { CourseData } from "../context/CourseContext.jsx";
import "./Admin.css";

export default function Admin() {
  const { courses, fetchCourses } = CourseData();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  // New-course form fields.
  const [course, setCourse] = useState({
    title: "",
    description: "",
    category: "Beginner",
    createdBy: "",
    duration: "",
    price: "",
  });
  const [courseImage, setCourseImage] = useState(null);

  // New-lecture form fields.
  const [lecture, setLecture] = useState({ courseId: "", title: "", description: "" });
  const [lectureVideo, setLectureVideo] = useState(null);

  async function loadAdminData() {
    const [statsRes, usersRes] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users")]);
    setStats(statsRes.data.stats);
    setUsers(usersRes.data.users);
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  // Create a course. Sends multipart form data because it includes an image.
  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!courseImage) return toast.error("Please choose a cover image");

    const form = new FormData();
    Object.entries(course).forEach(([k, v]) => form.append(k, v));
    form.append("file", courseImage);

    try {
      await api.post("/admin/courses", form);
      toast.success("Course created");
      setCourse({ title: "", description: "", category: "Beginner", createdBy: "", duration: "", price: "" });
      setCourseImage(null);
      e.target.reset();
      fetchCourses();
      loadAdminData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create course");
    }
  }

  // Add a video lecture to a chosen course.
  async function handleAddLecture(e) {
    e.preventDefault();
    if (!lecture.courseId) return toast.error("Pick a course");
    if (!lectureVideo) return toast.error("Please choose a video");

    const form = new FormData();
    form.append("title", lecture.title);
    form.append("description", lecture.description);
    form.append("file", lectureVideo);

    try {
      await api.post(`/admin/courses/${lecture.courseId}/lectures`, form);
      toast.success("Lecture added");
      setLecture({ courseId: "", title: "", description: "" });
      setLectureVideo(null);
      e.target.reset();
      loadAdminData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add lecture");
    }
  }

  async function deleteCourse(id) {
    if (!confirm("Delete this course and all its lectures?")) return;
    await api.delete(`/admin/courses/${id}`);
    toast.success("Course deleted");
    fetchCourses();
    loadAdminData();
  }

  return (
    <div className="page admin">
      <h2 className="section-title">Admin Dashboard</h2>

      {/* Stats */}
      {stats && (
        <div className="stat-row">
          <div className="stat-card"><span>{stats.totalCourses}</span>Courses</div>
          <div className="stat-card"><span>{stats.totalLectures}</span>Lectures</div>
          <div className="stat-card"><span>{stats.totalUsers}</span>Users</div>
        </div>
      )}

      <div className="admin-grid">
        {/* Create course */}
        <form className="admin-form" onSubmit={handleCreateCourse}>
          <h3>Create Course</h3>
          <input placeholder="Title" value={course.title}
            onChange={(e) => setCourse({ ...course, title: e.target.value })} required />
          <textarea placeholder="Description" value={course.description}
            onChange={(e) => setCourse({ ...course, description: e.target.value })} required />
          <input placeholder="Category" value={course.category}
            onChange={(e) => setCourse({ ...course, category: e.target.value })} />
          <input placeholder="Instructor name" value={course.createdBy}
            onChange={(e) => setCourse({ ...course, createdBy: e.target.value })} required />
          <input type="number" placeholder="Duration (weeks)" value={course.duration}
            onChange={(e) => setCourse({ ...course, duration: e.target.value })} required />
          <input type="number" placeholder="Price (₹, 0 = free)" value={course.price}
            onChange={(e) => setCourse({ ...course, price: e.target.value })} required />
          <label className="file-label">Cover image
            <input type="file" accept="image/*" onChange={(e) => setCourseImage(e.target.files[0])} />
          </label>
          <button className="common-btn">Create</button>
        </form>

        {/* Add lecture */}
        <form className="admin-form" onSubmit={handleAddLecture}>
          <h3>Add Lecture</h3>
          <select value={lecture.courseId}
            onChange={(e) => setLecture({ ...lecture, courseId: e.target.value })} required>
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
          <input placeholder="Lecture title" value={lecture.title}
            onChange={(e) => setLecture({ ...lecture, title: e.target.value })} required />
          <textarea placeholder="Lecture description" value={lecture.description}
            onChange={(e) => setLecture({ ...lecture, description: e.target.value })} />
          <label className="file-label">Video file
            <input type="file" accept="video/*" onChange={(e) => setLectureVideo(e.target.files[0])} />
          </label>
          <button className="common-btn">Add Lecture</button>
        </form>
      </div>

      {/* Existing courses */}
      <h3 className="admin-sub">All Courses</h3>
      <table className="admin-table">
        <thead>
          <tr><th>Title</th><th>Instructor</th><th>Price</th><th></th></tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c._id}>
              <td>{c.title}</td>
              <td>{c.createdBy}</td>
              <td>{c.price === 0 ? "Free" : `₹${c.price}`}</td>
              <td>
                <button className="common-btn danger small" onClick={() => deleteCourse(c._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Users */}
      <h3 className="admin-sub">Users</h3>
      <table className="admin-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
