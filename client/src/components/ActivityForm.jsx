import { useState } from "react";
import api from "../api/client.js";

const YOGA_TYPES = [
  "Hatha",
  "Vinyasa",
  "Ashtanga",
  "Yin",
  "Restorative",
  "Power",
  "Meditation",
  "Other",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Logs a new session. Calls onCreated() so the parent can refresh.
export default function ActivityForm({ onCreated }) {
  const [form, setForm] = useState({
    durationMinutes: 30,
    yogaType: "Hatha",
    date: todayISO(),
    notes: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/activities", {
        durationMinutes: Number(form.durationMinutes),
        yogaType: form.yogaType,
        date: form.date,
        notes: form.notes,
      });
      setForm({ ...form, notes: "" });
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="mb-4 text-lg font-semibold text-slate-700">Log a session</h2>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            className="input"
            max={todayISO()}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="duration">Minutes</label>
          <input
            id="duration"
            type="number"
            min={1}
            max={600}
            className="input"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="type">Type</label>
        <select
          id="type"
          className="input"
          value={form.yogaType}
          onChange={(e) => setForm({ ...form, yogaType: e.target.value })}
        >
          {YOGA_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          className="input"
          rows={2}
          maxLength={500}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <button type="submit" className="btn-primary mt-4 w-full" disabled={submitting}>
        {submitting ? "Saving…" : "Add session"}
      </button>
    </form>
  );
}
