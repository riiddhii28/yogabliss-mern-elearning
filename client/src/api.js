import axios from "axios";

// The backend server root (no trailing /api). Used for API calls and media URLs.
export const server = import.meta.env.VITE_SERVER || "http://localhost:5000";

// Turns a stored path like "uploads/course-1.jpg" into a full URL.
export const mediaUrl = (path) => `${server}/${path}`;

const api = axios.create({ baseURL: `${server}/api` });

// Attach the saved JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
