import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext.jsx";
import "./Auth.css";

export default function Register() {
  const { registerUser, btnLoading } = UserData();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    registerUser(name, email, password, navigate);
  }

  return (
    <div className="auth">
      <h2>Create your account</h2>
      <p className="sub">Start your yoga journey today.</p>

      <form onSubmit={handleSubmit}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input
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
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
