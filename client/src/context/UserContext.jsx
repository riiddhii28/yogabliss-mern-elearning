import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api.js";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true); // still checking the saved token?
  const [btnLoading, setBtnLoading] = useState(false); // a login/register in flight?

  // On first load, if we have a token, fetch the user behind it.
  useEffect(() => {
    const token = localStorage.getItem("yb_token");
    if (!token) return setLoading(false);

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        setIsAuth(true);
      })
      .catch(() => localStorage.removeItem("yb_token"))
      .finally(() => setLoading(false));
  }, []);

  async function loginUser(email, password, navigate) {
    setBtnLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("yb_token", data.token);
      setUser(data.user);
      setIsAuth(true);
      toast.success(`Welcome back, ${data.user.name}`);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setBtnLoading(false);
    }
  }

  async function registerUser(name, email, password, navigate) {
    setBtnLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("yb_token", data.token);
      setUser(data.user);
      setIsAuth(true);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setBtnLoading(false);
    }
  }

  function logout(navigate) {
    localStorage.removeItem("yb_token");
    setUser(null);
    setIsAuth(false);
    toast.success("Logged out");
    navigate("/login");
  }

  // Refresh the user (e.g. after enrolling in a course).
  async function refreshUser() {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
  }

  return (
    <UserContext.Provider
      value={{ user, isAuth, loading, btnLoading, loginUser, registerUser, logout, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const UserData = () => useContext(UserContext);
