import { daysFromToday } from "../dashboard/dateLabels.js";
import { groupAssignments } from "../mirror/assignmentState.js";

/** "Thu 5:00 PM". Plain words, not the shouting labels used elsewhere. */
export function whenText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = daysFromToday(iso);
  if (day === 0 || day === 1) return time;
  return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

/**
 * Open work from every course in four groups: Overdue, Today, Tomorrow, This week (the next 7 days).
 * `rows`: Blackboard assignment rows with `course_uuid`. Each group is soonest first.
 */
export function groupDue(rows, now = new Date()) {
  const open = groupAssignments(rows, now);
  const todo = open.todo.filter((a) => a.due_date);
  const within = (lo, hi) =>
    todo.filter((a) => {
      const d = daysFromToday(a.due_date, now);
      return d !== null && d >= lo && d <= hi;
    });
  return {
    overdue: [...open.missing].reverse(),
    today: within(0, 0),
    tomorrow: within(1, 1),
    week: within(2, 7),
  };
}

/** "Good morning" before noon, "Good afternoon" before 5pm, else "Good evening". */
export const greeting = (now = new Date()) => (now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening");
