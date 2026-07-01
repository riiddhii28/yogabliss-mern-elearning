import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext.jsx";
import "./Auth.css";

export default function Login() {
  const { loginUser, btnLoading } = UserData();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    loginUser(email, password, navigate);
  }

  return (
    <div className="auth">
      <h2>Welcome back</h2>
      <p className="sub">Log in to continue your practice.</p>

      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="common-btn" disabled={btnLoading}>
          {btnLoading ? "Logging in…" : "Login"}
        </button>
      </form>

      <p className="switch">
        No account? <Link to="/register">Sign up</Link>
      </p>

      <div className="demo">
        <strong>Try the demo:</strong>
        <br />
        Learner — demo@yogabliss.com / demo123
        <br />
        Admin — admin@yogabliss.com / admin123
      </div>
    </div>
  );
}
