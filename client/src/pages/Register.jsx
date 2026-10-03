import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserData } from "../context/UserContext.jsx";
import { authLink, returnDestination } from "../utils/navigation.js";
import "./Auth.css";

export default function Register() {
  const { registerUser, btnLoading, sessionNotice, authError, retrySession, loading } = UserData();
  const navigate = useNavigate();
  const destination = returnDestination(useLocation().search);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (await registerUser(name, email, password)) navigate(destination, { replace: true });
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="auth">
      <h2>Create your account</h2>
      <p className="sub">Start your yoga journey today.</p>

      {sessionNotice && <p role="status">{sessionNotice}</p>}
      {authError && <p role="alert">{authError} <button type="button" className="text-link" onClick={retrySession} disabled={loading}>Retry session</button></p>}
      {destination !== "/" && <p className="sub">After signing in, you'll return to your selected page.</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="auth-name">Name</label>
        <input id="auth-name" name="name" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required />

        <label htmlFor="auth-email">Email</label>
        <input id="auth-email" name="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          name="password"
          autoComplete="new-password"
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="common-btn" disabled={btnLoading}>
          {btnLoading ? "Creating…" : "Sign up"}
        </button>
      </form>

      <p className="switch">
        Already have an account? <Link to={authLink("/login", destination)}>Login</Link>
      </p>
    </div>
  );
}
