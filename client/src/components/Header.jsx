import { Link, useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext.jsx";
import "./Header.css";

export default function Header() {
  const { isAuth, user, logout } = UserData();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <img src="/yoga.png" alt="YogaBliss logo" className="logo-image" />
        YogaBliss
      </Link>

      <nav className="links">
        <Link to="/">Home</Link>
        <Link to="/courses">Courses</Link>
        <Link to="/about">About</Link>

        {isAuth ? (
          <>
            <Link to="/account">Account</Link>
            {user?.role === "admin" && <Link to="/admin">Admin</Link>}
            <button className="link-btn" onClick={() => logout(navigate)}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}
