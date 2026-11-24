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
 * Pure rules; nothing leaves the computer. Returns at most `max` of { key, courseId, code, why, text, resource }.
 * A grade gap never names the grade, because Home shows picks while grades are hidden.
 */
export function coursePicks(courses, resources, { now = new Date(), max = 3 } = {}) {
  const byId = new Map(resources.map((r) => [r.id, r]));
  const help = (code) => byId.get(NUMERIC.test(code) ? "ingenuity-lab-tutoring" : "center-for-academic-success") || byId.get("center-for-academic-success");
  const out = [];
  const seen = new Set();
  const add = (c, key, why, resource) => {
    if (!resource || seen.has(key)) return;
    seen.add(key);
    out.push({ key, courseId: c.id, code: c.code, why, text: `${c.code} ${why} → ${resource.name}`, resource });
  };
  const soon = (item) => {
    const d = item.dueDate ? daysFromToday(item.dueDate, now) : null;
    return d !== null && d >= 0 && d <= HORIZON_DAYS;
  };
  for (const c of courses) {
    const items = (c.items || []).filter(soon).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    const exam = items.find((i) => i.kind === "exam");
    if (exam) add(c, `exam:${c.id}`, `exam ${dayWord(exam.dueDate, now)}`, help(c.code));
    const paper = items.find((i) => i.kind !== "exam" && (i.kind === "paper" || WRITING.test(i.title)));
    if (paper) add(c, `write:${c.id}`, `${paper.title} due ${dayWord(paper.dueDate, now)}`, byId.get("writing-center"));
    if (c.current != null && c.target - c.current > GAP_POINTS) {
      add(c, `gap:${c.id}`, `under your target`, help(c.code));
    }
  }
  // Soonest need first: exams, then papers, then grade gaps. Array.sort is stable, so ties keep course order.
  const rank = (p) => ["exam", "write", "gap"].indexOf(p.key.split(":")[0]);
  return out.sort((a, b) => rank(a) - rank(b)).slice(0, max);
}

/**
 * One card per resource, with every reason it fits (#210): "Ingenuity Lab tutoring, for MATH 126 exam Tuesday
 * and for CH 101 under your target". Keeps the picks' order. Returns at most `max` of { key, resource, reasons }.
 */
export function groupPicks(picks, { max = 3 } = {}) {
  const groups = new Map();
  for (const p of picks || []) {
    if (!groups.has(p.resource.id)) groups.set(p.resource.id, { key: p.resource.id, resource: p.resource, reasons: [] });
    const { reasons } = groups.get(p.resource.id);
    const same = reasons.find((x) => x.courseId === p.courseId);
    if (same) same.why = `${same.why}, ${p.why}`;
    else reasons.push({ key: p.key, courseId: p.courseId, code: p.code, why: p.why });
  }
  return [...groups.values()].slice(0, max);
}
