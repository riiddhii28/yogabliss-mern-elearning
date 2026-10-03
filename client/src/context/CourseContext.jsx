import { createContext, useCallback, useContext } from "react";
import api from "../api.js";
import useResource from "../hooks/useResource.js";

const CourseContext = createContext();
export function CourseProvider({ children }) {
  const load = useCallback(async (signal) => (await api.get("/courses", { signal })).data.courses, []);
  const { data, loading, error, retry } = useResource(load);
  return (
    <CourseContext.Provider value={{ courses: data || [], loading, error, fetchCourses: retry }}>
      {children}
    </CourseContext.Provider>
  );
}
export const CourseData = () => useContext(CourseContext);
