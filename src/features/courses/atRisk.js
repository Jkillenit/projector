import { daysFromToday } from "../dashboard/dateLabels.js";

/** An exam this many days away or closer puts a class at risk (#213). */
export const EXAM_DAYS = 10;

const dayWord = (iso, now) => {
  const d = daysFromToday(iso, now);
  return d === 0 ? "today" : d === 1 ? "tomorrow" : new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
};

/**
 * Is a class at risk, and why (#213)? At risk means below the target grade, or an exam within EXAM_DAYS.
 * `course`: { current, target, items: [{ kind, dueDate }] } (Home's course facts). Pure; nothing leaves the computer.
 * Reasons are words only, like "under your target" or "exam Friday": never the grade, so the card is safe while
 * grades are hidden.
 */
export function riskOf(course, { now = new Date() } = {}) {
  const reasons = [];
  const { current, target } = course || {};
  if (current != null && target != null && current < target) reasons.push("under your target");
  const exam = (course?.items || [])
    .filter((i) => i.kind === "exam" && i.dueDate)
    .map((i) => ({ i, d: daysFromToday(i.dueDate, now) }))
    .filter(({ d }) => d !== null && d >= 0 && d <= EXAM_DAYS)
    .sort((a, b) => a.d - b.d)[0];
  if (exam) reasons.push(`exam ${dayWord(exam.i.dueDate, now)}`);
  return { atRisk: reasons.length > 0, reasons };
}
