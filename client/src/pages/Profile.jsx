import { useState } from "react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    weeklyGoalMinutes: user.weeklyGoalMinutes,
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const res = await api.put("/profile", {
        name: form.name,
        weeklyGoalMinutes: Number(form.weeklyGoalMinutes),
      });
      setUser(res.data.user);
      setStatus({ type: "ok", message: "Profile updated." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Profile</h1>

      <div className="card">
        <div className="mb-4">
          <p className="text-sm text-slate-500">Email</p>
          <p className="font-medium text-slate-700">{user.email}</p>
        </div>

        {status.message && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              status.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="goal">Weekly goal (minutes)</label>
            <input
              id="goal"
              type="number"
              min={0}
              max={10000}
              className="input"
              value={form.weeklyGoalMinutes}
              onChange={(e) => setForm({ ...form, weeklyGoalMinutes: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-400">
              The WHO suggests ~150 minutes of activity per week.
            </p>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
