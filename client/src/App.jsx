import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
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
import ContentState, { CoursesLink } from "./components/ContentState.jsx";
import { authLink, returnDestination } from "./utils/navigation.js";

// Code-split the admin panel — regular visitors never download it.
const Admin = lazy(() => import("./pages/Admin.jsx"));

export default function App() {
  const { isAuth, user, loading, authError, retrySession } = UserData();
  const location = useLocation();
  const destination = returnDestination(location.search);
  const authed = (element) => {
    if (loading) return <Loading message="Checking your session…" />;
    if (authError) return <ContentState title="Session temporarily unavailable" message={authError} error onRetry={retrySession}><CoursesLink /></ContentState>;
    return isAuth ? element : <Navigate to={authLink("/login", location.pathname)} replace />;
  };

  return (
    <div className="app">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<Courses />} />

          <Route path="/login" element={isAuth ? <Navigate to={destination} replace /> : <Login />} />
          <Route path="/register" element={isAuth ? <Navigate to={destination} replace /> : <Register />} />

          <Route path="/account" element={authed(<Account />)} />
          <Route path="/course/:id" element={<CourseDescription key={location.pathname} />} />
          <Route path="/course/study/:id" element={authed(<CourseStudy key={location.pathname} />)} />

          <Route
            path="/admin"
            element={
              authed(user?.role === "admin" ? (
                <Suspense fallback={<Loading />}>
                  <Admin />
                </Suspense>
              ) : (
                <Navigate to="/" replace />
              ))
            }
          />

          <Route path="*" element={<ContentState title="Page not found" message="That page isn't available."><Link className="common-btn" to="/">Home</Link><CoursesLink /></ContentState>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
