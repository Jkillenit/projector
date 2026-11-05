import { localDayKey } from "../../lib/dates.js";

/**
 * Study and tutoring sessions the student adds by hand ("Add my session"). Saved on this computer only (rule 4),
 * in the settings key below. On the map they sit beside classes as one "your day" layer.
 */
export const SESSIONS_KEY = "projector.mySessions";
export const KINDS = [
  ["tutoring", "Tutoring"],
  ["study", "Study session"],
  ["other", "Other"],
];

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00`));
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Saved text → sessions; anything broken becomes an empty list. */
export function parseSessions(raw) {
  try {
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list.filter((s) => s && s.id && isDate(s.date) && isTime(s.start)) : [];
  } catch {
    return [];
  }
}

/** Form fields → { ok: true, session } or { ok: false, error } in plain words. */
export function makeSession(fields, now = new Date(), id = `ses_${Math.random().toString(36).slice(2, 10)}`) {
  const title = String(fields?.title || "").trim().slice(0, 80);
  const where = String(fields?.where || "").trim().slice(0, 80);
  const room = String(fields?.room || "").trim().slice(0, 20);
  const { date = "", start = "", end = "" } = fields || {};
  const kind = KINDS.some(([k]) => k === fields?.kind) ? fields.kind : "other";
  if (!title) return { ok: false, error: "Say what the session is." };
  if (!isDate(date)) return { ok: false, error: "Pick a day." };
  if (!isTime(start)) return { ok: false, error: "Pick a start time." };
  if (end && (!isTime(end) || end <= start)) return { ok: false, error: "The end time has to be after the start." };
  if (date < localDayKey(now)) return { ok: false, error: "That day has already passed." };
  if (!where) return { ok: false, error: "Say where it is, like Gorgas Library or Online." };
  return { ok: true, session: { id, kind, title, date, start, end: end || null, where, room } };
}

/** Sessions that have not ended yet, soonest first. One with no end time counts as an hour. */
export function upcomingSessions(list, now = new Date()) {
  const today = localDayKey(now);
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const endOf = (s) => s.end || `${String(Math.min(23, Number(s.start.slice(0, 2)) + 1)).padStart(2, "0")}${s.start.slice(2)}`;
  return (list || [])
    .filter((s) => s.date > today || (s.date === today && endOf(s) > time))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/** A session in the shape the map's class layer uses, marked so the panel can say "Tutoring" instead of a course. */
export const asMeeting = (s) => ({ id: s.id, kind: s.kind, course: s.title, title: s.title, date: s.date, start: s.start, end: s.end, building: s.where, room: s.room, session: true });
