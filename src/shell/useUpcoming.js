import { useCallback, useEffect, useState } from "react";
import { courseStore } from "../db/courseStore.js";
import { daysFromToday } from "../features/dashboard/dateLabels.js";
import { isDone } from "../features/mirror/assignmentState.js";

const EVENTS = ["studyhub-mirror-changed", "studyhub-bb-synced"];

/** Open work due in the next 7 days, counted per course id. Pure. */
export function countDueThisWeek(rows, now = new Date()) {
  const counts = {};
  for (const r of rows || []) {
    const d = r.due_date ? daysFromToday(r.due_date, now) : null;
    if (isDone(r) || d == null || d < 0 || d > 7 || Date.parse(r.due_date) < now.getTime()) continue;
    counts[r.course_uuid] = (counts[r.course_uuid] || 0) + 1;
  }
  return counts;
}

/** Upcoming assignments from every course (for sidebar counts and the command palette). */
export function useUpcoming() {
  const [state, setState] = useState({ rows: [], counts: {} });
  const load = useCallback(async () => {
    const dash = await courseStore.getDashboard().catch(() => null);
    const rows = dash?.upcoming || [];
    setState({ rows, counts: countDueThisWeek(rows) });
  }, []);
  useEffect(() => {
    void load();
    EVENTS.forEach((n) => window.addEventListener(n, load));
    return () => EVENTS.forEach((n) => window.removeEventListener(n, load));
  }, [load]);
  return state;
}
