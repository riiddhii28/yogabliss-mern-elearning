import { Routes, Route, Navigate } from "react-router-dom";
import { UserData } from "./context/UserContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Loading from "./components/Loading.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Courses from "./pages/Courses.jsx";
import CourseDescription from "./pages/CourseDescription.jsx";
import CourseStudy from "./pages/CourseStudy.jsx";
import Account from "./pages/Account.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const { isAuth, user, loading } = UserData();

  if (loading) return <Loading />;

  // Small helpers: send guests to login, and route by role.
  const authed = (element) => (isAuth ? element : <Navigate to="/login" replace />);

  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<Courses />} />

          <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={isAuth ? <Navigate to="/" replace /> : <Register />} />

          <Route path="/account" element={authed(<Account />)} />
          <Route path="/course/:id" element={authed(<CourseDescription />)} />
          <Route path="/course/study/:id" element={authed(<CourseStudy />)} />

          <Route
            path="/admin"
            element={isAuth && user?.role === "admin" ? <Admin /> : <Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
