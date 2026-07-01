import { useEffect, useState } from "react";
import api from "../api/client.js";

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"];

const levelStyle = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Advanced: "bg-rose-100 text-rose-700",
};

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [level, setLevel] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = level === "All" ? {} : { level };
    api
      .get("/classes", { params })
      .then((res) => setClasses(res.data.classes))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [level]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Class catalog</h1>
        <p className="text-slate-500">Browse sessions and find your next practice.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              level === l ? "bg-brand-500 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {loading ? (
        <p className="text-slate-500">Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className="text-slate-500">
          No classes found. Have you run <code className="rounded bg-slate-100 px-1">npm run seed</code>?
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c._id} className="card flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelStyle[c.level]}`}>
                  {c.level}
                </span>
                <span className="text-sm text-slate-400">{c.durationMinutes} min</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-800">{c.name}</h3>
              {c.focus && <p className="text-sm font-medium text-brand-600">{c.focus}</p>}
              <p className="mt-2 text-sm text-slate-500">{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
