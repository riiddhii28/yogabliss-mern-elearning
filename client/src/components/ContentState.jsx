import { Link } from "react-router-dom";

export default function ContentState({ title, message, error = false, onRetry, children }) {
  return (
    <section className="content-state" role={error ? "alert" : "status"}>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      <div className="action-row">
        {onRetry && <button className="common-btn" onClick={onRetry}>Retry</button>}
        {children}
      </div>
    </section>
  );
}
export function CoursesLink() {
  return <Link className="text-link" to="/courses">Back to Courses</Link>;
}
