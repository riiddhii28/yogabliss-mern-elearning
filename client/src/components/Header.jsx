import { Link, NavLink, useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext.jsx";
import "./Header.css";

export default function Header() {
  const { isAuth, user, logout } = UserData();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Link to="/" className="logo">
        <img src="/yoga.png" alt="YogaBliss logo" className="logo-image" />
        YogaBliss
      </Link>

      <nav className="links" aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/courses">Courses</NavLink>
        <NavLink to="/about">About</NavLink>

        {isAuth ? (
          <>
            <NavLink to="/account">Account</NavLink>
            {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
            <button className="link-btn" onClick={() => logout(navigate)}>
              Logout
            </button>
          </>
        ) : (
          <NavLink to="/login">Login</NavLink>
        )}
      </nav>
    </header>
  );
}
