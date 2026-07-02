import axios from "axios";

// The backend server root (no trailing /api). Used for API calls and media URLs.
export const server = import.meta.env.VITE_SERVER || "http://localhost:5000";

// Resolves a stored media reference to a usable URL.
// - Cloudinary/absolute URLs (production) are returned as-is.
// - Local "uploads/course-1.jpg" paths (dev) get the API host prepended.
export const mediaUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${server}/${path}`;
};

// Same, but for card/list images: asks Cloudinary to resize + auto-compress on the fly
// (a ~2.5MB original becomes a ~60KB thumbnail). Non-Cloudinary URLs pass through.
export const thumbUrl = (path, width = 600) => {
  const url = mediaUrl(path);
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},c_limit,f_auto,q_auto/`);
};

const api = axios.create({ baseURL: `${server}/api` });

// Attach the saved JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
