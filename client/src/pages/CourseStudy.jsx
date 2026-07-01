import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { mediaUrl } from "../api.js";
import Loading from "../components/Loading.jsx";
import "./CourseStudy.css";

export default function CourseStudy() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lectures, setLectures] = useState([]);
  const [active, setActive] = useState(null); // lecture being watched
  const [progress, setProgress] = useState({ percentage: 0, completedLectures: [] });
  const [loading, setLoading] = useState(true);

  // Load lectures + progress together.
  async function load() {
    try {
      const [lecRes, progRes] = await Promise.all([
        api.get(`/courses/${id}/lectures`),
        api.get(`/courses/${id}/progress`),
      ]);
      setLectures(lecRes.data.lectures);
      setActive(lecRes.data.lectures[0] || null);
      setProgress(progRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Cannot open this course");
      navigate("/courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function markComplete(lectureId) {
    await api.post(`/courses/${id}/progress`, { lectureId });
    const { data } = await api.get(`/courses/${id}/progress`);
    setProgress(data);
    toast.success("Marked as complete");
  }

  if (loading) return <Loading />;

  const isDone = (lectureId) => progress.completedLectures.includes(lectureId);

  return (
    <div className="page">
      {/* Progress bar */}
      <div className="progress-wrap">
        <div className="progress-head">
          <span>Course progress</span>
          <span>{progress.percentage}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
        </div>
      </div>

      <div className="study">
        {/* Video player */}
        <div className="player">
          {active ? (
            <>
              <video src={mediaUrl(active.video)} controls className="video" />
              <h2>{active.title}</h2>
              <p className="lec-desc">{active.description}</p>
              <button
                className="common-btn"
                disabled={isDone(active._id)}
                onClick={() => markComplete(active._id)}
              >
                {isDone(active._id) ? "Completed ✓" : "Mark as complete"}
              </button>
            </>
          ) : (
            <p>No lectures in this course yet.</p>
          )}
        </div>

        {/* Lecture list */}
        <aside className="lecture-list">
          <h3>Lectures</h3>
          {lectures.map((lec, i) => (
            <button
              key={lec._id}
              className={`lecture-item ${active?._id === lec._id ? "current" : ""}`}
              onClick={() => setActive(lec)}
            >
              <span className="num">{i + 1}</span>
              <span className="lec-title">{lec.title}</span>
              {isDone(lec._id) && <span className="tick">✓</span>}
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
