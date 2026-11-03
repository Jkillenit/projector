import { daysFromToday } from "../dashboard/dateLabels.js";

const NUMERIC = /^(MATH|CH|CHEM|PH|PHYS|ST|STAT|CS|EC|ECON)\b/;
const WRITING = /\b(paper|essay|draft|writing|reflection|memo)\b/i;
const HORIZON_DAYS = 10;
const GAP_POINTS = 2;

const dayWord = (iso, now) => {
  const d = daysFromToday(iso, now);
  return d === 0 ? "today" : d === 1 ? "tomorrow" : new Date(iso).toLocaleDateString([], { weekday: "long" });
};

/**
 * Campus help tied to the student's own classes, never generic. Each pick is one line such as
 * "MKT 300 exam Sunday → Center for Academic Success", built only from real due dates and grades.
 * `courses`: [{ id, code, current, target, items: [{ title, kind, dueDate }] }]. `resources`: the directory.
 * Pure rules; nothing leaves the computer. Returns at most `max` of { key, courseId, text, resource }.
 */
export function coursePicks(courses, resources, { now = new Date(), max = 3 } = {}) {
  const byId = new Map(resources.map((r) => [r.id, r]));
  const help = (code) => byId.get(NUMERIC.test(code) ? "ingenuity-lab-tutoring" : "center-for-academic-success") || byId.get("center-for-academic-success");
  const out = [];
  const seen = new Set();
  const add = (courseId, key, text, resource) => {
    if (!resource || seen.has(key)) return;
    seen.add(key);
    out.push({ key, courseId, text: `${text} → ${resource.name}`, resource });
  };
  const soon = (item) => {
    const d = item.dueDate ? daysFromToday(item.dueDate, now) : null;
    return d !== null && d >= 0 && d <= HORIZON_DAYS;
  };
  for (const c of courses) {
    const items = (c.items || []).filter(soon).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    const exam = items.find((i) => i.kind === "exam");
    if (exam) add(c.id, `exam:${c.id}`, `${c.code} exam ${dayWord(exam.dueDate, now)}`, help(c.code));
    const paper = items.find((i) => i.kind !== "exam" && (i.kind === "paper" || WRITING.test(i.title)));
    if (paper) add(c.id, `write:${c.id}`, `${c.code} ${paper.title} due ${dayWord(paper.dueDate, now)}`, byId.get("writing-center"));
    if (c.current != null && c.target - c.current > GAP_POINTS) {
      add(c.id, `gap:${c.id}`, `${c.code} is at ${Math.round(c.current)}%, you want ${Math.round(c.target)}%`, help(c.code));
    }
  }
  // Soonest need first: exams, then papers, then grade gaps. Array.sort is stable, so ties keep course order.
  const rank = (p) => ["exam", "write", "gap"].indexOf(p.key.split(":")[0]);
  return out.sort((a, b) => rank(a) - rank(b)).slice(0, max);
}
