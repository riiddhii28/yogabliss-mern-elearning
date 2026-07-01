import { createContext, useContext, useEffect, useState } from "react";
import api from "../api.js";

const CourseContext = createContext();

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);

  async function fetchCourses() {
    try {
      const { data } = await api.get("/courses");
      setCourses(data.courses);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <CourseContext.Provider value={{ courses, fetchCourses }}>
      {children}
    </CourseContext.Provider>
  );
}

export const CourseData = () => useContext(CourseContext);
