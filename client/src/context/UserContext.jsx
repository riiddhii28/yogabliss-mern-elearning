import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "../api.js";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [btnLoading, setBtnLoading] = useState(false);
  const authPending = useRef(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem("yb_token");
    setUser(null);
    setAuthError("");
  }, []);

  useEffect(() => {
    const interceptor = api.interceptors.response.use((response) => response, (error) => {
      const request = error.config;
      // A failed login is not an expired existing session; ignore stale-token responses.
      if (error.response?.status === 401 && request?.sessionToken &&
          request.sessionToken === localStorage.getItem("yb_token") &&
          !["/auth/login", "/auth/register"].includes(request.url)) {
        clearSession();
        setSessionNotice("Your session has expired. Please log in again.");
      }
      return Promise.reject(error);
    });
    return () => api.interceptors.response.eject(interceptor);
  }, [clearSession]);

  const restoreSession = useCallback(async (signal) => {
    const token = localStorage.getItem("yb_token");
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setAuthError("");
    try {
      const { data } = await api.get("/auth/me", { signal });
      if (!signal?.aborted && localStorage.getItem("yb_token") === token) setUser(data.user);
    } catch (error) {
      if (!signal?.aborted && error.response?.status !== 401 && localStorage.getItem("yb_token") === token) {
        setAuthError("We couldn't check your session. Your login is saved; please retry.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    restoreSession(controller.signal);
    return () => controller.abort();
  }, [restoreSession]);

  async function authenticate(path, values) {
    if (authPending.current) return false;
    authPending.current = true;
    setBtnLoading(true);
    try {
      const { data } = await api.post(path, values);
      localStorage.setItem("yb_token", data.token);
      setUser(data.user);
      setAuthError("");
      setSessionNotice("");
      toast.success(path === "/auth/login" ? `Welcome back, ${data.user.name}` : "Account created");
      return true;
    } catch (error) {
      const detail = error.response?.data?.details?.[0]?.message;
      throw new Error(detail || error.response?.data?.error || "Couldn't connect. Please try again.");
    } finally {
      authPending.current = false;
      setBtnLoading(false);
    }
  }

  function logout(navigate) {
    clearSession();
    setSessionNotice("");
    toast.success("Logged out");
    navigate("/login");
  }

  async function refreshUser() {
    const token = localStorage.getItem("yb_token");
    const { data } = await api.get("/auth/me");
    if (localStorage.getItem("yb_token") === token) setUser(data.user);
  }

  return (
    <UserContext.Provider value={{ user, isAuth: Boolean(user), loading, authError, sessionNotice,
      retrySession: () => restoreSession(), btnLoading,
      loginUser: (email, password) => authenticate("/auth/login", { email, password }),
      registerUser: (name, email, password) => authenticate("/auth/register", { name, email, password }),
      logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}
export const UserData = () => useContext(UserContext);
