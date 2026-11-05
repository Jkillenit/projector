import { localDayKey } from "../../lib/dates.js";
import { weekDays, weekStart } from "../dashboard/calendarWeek.js";
import { daysFromToday } from "../dashboard/dateLabels.js";
import { interestsOf } from "../clubs/sourceClubs.js";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** "Monday, November 2 · 6 things due this week · 1 new grade". The grades part drops out at 0. */
export function subtitleText(now, dueCount, newGrades) {
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return [date, `${plural(dueCount, "thing", "things")} due this week`, newGrades ? plural(newGrades, "new grade", "new grades") : null].filter(Boolean).join(" · ");
}

/** Time left as a short mono label: "3h", "2d", "late". */
export function timeLeft(iso, now = new Date()) {
  const ms = Date.parse(iso) - now.getTime();
  if (Number.isNaN(ms)) return "";
  if (ms < 0) return "late";
  const h = ms / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (Math.round(h) < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

const KINDS = { exam: "Exam", quiz: "Quiz", paper: "Paper", project: "Project", reading: "Reading", discussion: "Discussion" };
/** "Extra credit" for XC titles, else the plain kind name. */
export const kindLabel = (kind, title = "") => (/^\s*(xc|extra credit)\b/i.test(title) ? "Extra credit" : KINDS[kind] || "Assignment");

/** "11:59 PM" */
export const timeText = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "Due 11:59 PM tonight" for today, "Sun 11:59 PM" otherwise. `today` tells the caller to use the accent pill. */
export function dueText(iso, now = new Date()) {
  const d = daysFromToday(iso, now);
  if (d == null) return { text: "No due date", today: false };
  if (d === 0) return { text: `Due ${timeText(iso)} ${new Date(iso).getHours() >= 17 ? "tonight" : "today"}`, today: true };
  if (d === 1) return { text: `Tomorrow ${timeText(iso)}`, today: false };
  const day = new Date(iso).toLocaleDateString("en-US", d > 6 || d < 0 ? { month: "short", day: "numeric" } : { weekday: "short" });
  return { text: `${day} ${timeText(iso)}`, today: false };
}

/**
 * Mon..Sun of this week: [{ key, date, name, isToday, items }] where `items` are the open rows due that day.
 * `rows`: { due_date, course_uuid }.
 */
export function weekCells(rows, now = new Date()) {
  const todayKey = localDayKey(now);
  const byDay = new Map();
  for (const r of rows || []) {
    if (!r.due_date) continue;
    const k = localDayKey(new Date(r.due_date));
    byDay.set(k, [...(byDay.get(k) || []), r]);
  }
  return weekDays(weekStart(now)).map((date) => {
    const key = localDayKey(date);
    return { key, date, name: date.toLocaleDateString("en-US", { weekday: "short" }), isToday: key === todayKey, items: byDay.get(key) || [] };
  });
}

/**
 * Three suggestion chips built from the student's own top tasks, then one campus chip. Uses course codes
 * and task kinds only, never grades. `tasks`: [{ code, kind, title }]. `interests`: profile interests.
 */
export function askSuggestions(tasks, interests = []) {
  const out = [];
  const push = (s) => !out.includes(s) && out.push(s);
  // Exams first, then papers, then anything else, so the chips point at the work that needs help most.
  const rank = (t) => (t.kind === "exam" ? 0 : t.kind === "paper" || /\b(essay|paper|case|draft|reflection|memo)\b/i.test(t.title) ? 1 : 2);
  for (const t of [...tasks].sort((a, b) => rank(a) - rank(b))) {
    if (out.length >= 2) break;
    if (!t.code) continue;
    if (t.kind === "exam") push(`Study help before my ${t.code} exam`);
    else if (t.kind === "paper" || /\b(essay|paper|case|draft|reflection|memo)\b/i.test(t.title)) push(`Someone to read my ${t.code} ${(t.title.match(/\b(essay|paper|case|draft|reflection|memo)\b/i)?.[1] || "paper").toLowerCase()}`);
    else push(`Tutoring for ${t.code}`);
  }
  if (out.length < 2) push("Tutoring for any class");
  push(`Find a club for ${interests[0] || "coding"}`);
  return out.slice(0, 3);
}

/** "Essay 2 posted today", "Quiz 4 posted Friday". */
export function postedText(name, iso, now = new Date()) {
  const d = daysFromToday(iso, now);
  const when = d === 0 ? "today" : d === -1 ? "yesterday" : new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
  return `${name} posted ${when}`;
}

/** Up to `n` campus events for Home: ones that match the student's interests first, each group soonest first. */
export function homeEvents(events, interests = [], n = 3) {
  const tagged = events.map((e) => ({ ...e, match: interestsOf(e.text || e.title || "").filter((i) => interests.includes(i)) }));
  return [...tagged.filter((e) => e.match.length), ...tagged.filter((e) => !e.match.length)].slice(0, n);
}
