import "./Loading.css";

// Simple full-screen spinner shown while we check the login token.
export default function Loading({ message = "Loading…" }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
