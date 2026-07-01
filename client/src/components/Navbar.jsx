import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? "bg-brand-100 text-brand-700" : "text-slate-600 hover:text-brand-700"
    }`;

  return (
    <header className="bg-white border-b border-slate-100">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
          <span aria-hidden>🧘</span> YogaBliss
        </Link>

        {user ? (
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/classes" className={linkClass}>
              Classes
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
            <button onClick={handleLogout} className="btn-ghost ml-2 text-sm">
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink to="/login" className={linkClass}>
              Log in
            </NavLink>
            <Link to="/register" className="btn-primary text-sm">
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
