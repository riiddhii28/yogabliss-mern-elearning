import "./Loading.css";

// Simple full-screen spinner shown while we check the login token.
export default function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
    </div>
  );
}
