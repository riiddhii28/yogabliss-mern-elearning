import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { CourseData } from "../context/CourseContext.jsx";
import CourseCard from "../components/CourseCard.jsx";
import Loading from "../components/Loading.jsx";
import ContentState from "../components/ContentState.jsx";
import "./Courses.css";

export default function Courses() {
  const { courses, loading, error, fetchCourses } = CourseData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  // Category chips, derived from the data itself.
  const categories = useMemo(
    () => ["All", ...new Set(courses.map((c) => c.category).filter(Boolean))],
    [courses]
  );

  const visible = courses.filter((c) => {
    const matchesCategory = category === "All" || c.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.createdBy.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  if (loading) return <Loading message="Loading courses…" />;
  if (error) return <ContentState title="Couldn't load courses" message="Check your connection and try again." error onRetry={fetchCourses} />;
  if (!courses.length) return <ContentState title="No courses available yet" message="Please check back soon." onRetry={fetchCourses} />;

  return (
    <div className="page">
      <h2 className="section-title">Available Courses</h2>

      {/* Search + category filters */}
      <div className="catalog-controls">
        <div className="search-box">
          <FiSearch aria-hidden />
          <input
            type="search"
            placeholder="Search courses or instructors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search courses"
          />
        </div>
        <div className="category-chips">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`chip ${category === cat ? "active" : ""}`}
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="course-grid">
        {visible.length > 0 ? (
          visible.map((c) => <CourseCard key={c._id} course={c} />)
        ) : (
          <ContentState title="No matching courses" message="Try a different search or category.">
            <button className="common-btn" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button>
          </ContentState>
        )}
      </div>
    </div>
  );
}
