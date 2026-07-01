// Pure stat computation from a list of activities (sorted ascending by date).
// Kept separate from routes so it's easy to reason about and test.

function toDayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function startOfWeek(now) {
  // Week starts Monday.
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - day);
  return d;
}

export function computeStats(activities, weeklyGoalMinutes = 150, now = new Date()) {
  const totalSessions = activities.length;
  const totalMinutes = activities.reduce((sum, a) => sum + a.durationMinutes, 0);

  // Minutes practised this week.
  const weekStart = startOfWeek(now);
  const weekMinutes = activities
    .filter((a) => new Date(a.date) >= weekStart)
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  // Set of days with at least one session.
  const activeDays = new Set(activities.map((a) => toDayKey(a.date)));

  // Current streak: consecutive days up to today (or yesterday) with a session.
  let currentStreak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!activeDays.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1); // allow streak to count through yesterday
  }
  while (activeDays.has(toDayKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Daily minutes for the last 30 days (chart series).
  const dailySeries = [];
  const byDay = new Map();
  for (const a of activities) {
    const key = toDayKey(a.date);
    byDay.set(key, (byDay.get(key) || 0) + a.durationMinutes);
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = toDayKey(d);
    dailySeries.push({ date: key, minutes: byDay.get(key) || 0 });
  }

  // Minutes by yoga type (for a breakdown chart).
  const byType = {};
  for (const a of activities) {
    byType[a.yogaType] = (byType[a.yogaType] || 0) + a.durationMinutes;
  }
  const typeBreakdown = Object.entries(byType).map(([type, minutes]) => ({ type, minutes }));

  const goalProgress =
    weeklyGoalMinutes > 0 ? Math.min(100, Math.round((weekMinutes / weeklyGoalMinutes) * 100)) : 0;

  return {
    totalSessions,
    totalMinutes,
    weekMinutes,
    weeklyGoalMinutes,
    goalProgress,
    currentStreak,
    dailySeries,
    typeBreakdown,
  };
}
