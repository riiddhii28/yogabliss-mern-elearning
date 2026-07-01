import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Attach the JWT to every request if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("yb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Surface a clean error message and auto-logout on 401.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("yb_token")) {
      localStorage.removeItem("yb_token");
      // Let the app react to the change on next navigation.
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    const message =
      err.response?.data?.error ||
      err.response?.data?.details?.[0]?.message ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;
