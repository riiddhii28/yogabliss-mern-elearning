import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import ActivityForm from "../components/ActivityForm.jsx";
import StatCard from "../components/StatCard.jsx";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [statsRes, actRes] = await Promise.all([
        api.get("/activities/stats"),
        api.get("/activities", { params: { limit: 8 } }),
      ]);
      setStats(statsRes.data.stats);
      setActivities(actRes.data.activities);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    await api.delete(`/activities/${id}`);
    load();
  };

  if (loading) return <div className="text-center text-slate-500">Loading your dashboard…</div>;
  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>;

  const chartData = stats.dailySeries.map((d) => ({ ...d, label: formatDate(d.date) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hi, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-slate-500">Here's how your practice is going.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Current streak" value={`${stats.currentStreak}d`} sub="consecutive days" />
        <StatCard label="This week" value={`${stats.weekMinutes}m`} sub={`goal ${stats.weeklyGoalMinutes}m`} />
        <StatCard label="Total sessions" value={stats.totalSessions} />
        <StatCard label="Total minutes" value={stats.totalMinutes} />
      </div>

      {/* Weekly goal progress */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Weekly goal progress</span>
          <span className="text-slate-500">{stats.goalProgress}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${stats.goalProgress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Chart */}
        <div className="card md:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Last 30 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} min`, "Practice"]} />
                <Bar dataKey="minutes" fill="#4e8f6d" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Log form */}
        <ActivityForm onCreated={load} />
      </div>

      {/* Recent sessions */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-slate-700">Recent sessions</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-500">No sessions yet — log your first one above.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activities.map((a) => (
              <li key={a._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-700">
                    {a.yogaType} · {a.durationMinutes} min
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(a.date).toLocaleDateString()}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a._id)}
                  className="text-sm text-slate-400 hover:text-red-600"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
