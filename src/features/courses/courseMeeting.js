/**
 * Where and when a course meets, saved as a course setting on this computer (rule 4).
 * Shape (from extractMeeting in src/syllabus/syllabusParser.js, plus where it came from):
 * { mode, days: "MWF" (R = Thursday), start: "09:00", end: "09:50", building, room, source: "syllabus" | "manual" }
 */

const MODES = ["in_person", "online_sync", "online_async", "hybrid"];
const DAY_ORDER = "MTWRF";
const DAY_NAME = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" };
const NO_MEETING = { days: "", start: null, end: null, building: "", room: "" };

export const meetingKey = (courseUuid) => `course.meeting.${courseUuid}`;

/** A saved setting back to a meeting, or null when it is missing or not one. */
export function readMeeting(raw) {
  try {
    const m = JSON.parse(raw);
    return m && typeof m === "object" && MODES.includes(m.mode) ? m : null;
  } catch {
    return null;
  }
}

const clock = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const sortDays = (days) => [...DAY_ORDER].filter((d) => [...(days || "")].includes(d)).join("");

/** "Meets Mon, Wed, Fri, 9:00 AM to 9:50 AM, in Bidgood Hall 116". Empty when we do not know. */
export function meetingLabel(m) {
  if (!m || !MODES.includes(m.mode)) return "";
  if (m.mode === "online_async") return "Online, no set meeting time";
  const when = [
    ...[...sortDays(m.days)].map((d) => DAY_NAME[d]),
    m.start ? `${clock(m.start)}${m.end ? ` to ${clock(m.end)}` : ""}` : "",
  ].filter(Boolean);
  if (m.mode === "online_sync") return ["Online", ...when].join(", ");
  const place = [m.building, m.room].filter(Boolean).join(" ");
  const where = `in ${place}${m.mode === "hybrid" ? " and online" : ""}`;
  return when.length ? `Meets ${when.join(", ")}, ${where}` : `Meets ${where}`;
}

/** The syllabus fills in the meeting, but never over one the student fixed by hand. */
export const shouldSaveSyllabusMeeting = (existing, parsed) => MODES.includes(parsed?.mode) && existing?.source !== "manual";

/** The "Fix it" form to a meeting, or a plain error. Days come as letters, times as "HH:MM". */
export function meetingFromForm({ mode, days, start, end, building, room }) {
  if (!MODES.includes(mode)) return { error: "Pick how the class meets." };
  if (mode === "online_async") return { meeting: { mode, ...NO_MEETING, source: "manual" } };
  const place = mode === "online_sync" ? { building: "", room: "" } : { building: String(building || "").trim(), room: String(room || "").trim() };
  if (mode !== "online_sync" && !place.building) return { error: "Add the building." };
  const dayLetters = sortDays((days || []).join(""));
  if (mode === "online_sync" && !dayLetters) return { error: "Pick the days it meets." };
  if (mode === "online_sync" && !start) return { error: "Add the start time." };
  if (start && end && end <= start) return { error: "The class has to end after it starts." };
  return { meeting: { mode, days: dayLetters, start: start || null, end: (start && end) || null, ...place, source: "manual" } };
}

/** A demo schedule row (src/demo/schedule.json, days 1 = Monday) as if the syllabus had said it. */
export function scheduleToMeeting(row) {
  if (!row) return null;
  if (row.online) return { mode: "online_async", ...NO_MEETING, source: "syllabus" };
  return {
    mode: "in_person",
    days: row.days.map((d) => DAY_ORDER[d - 1]).join(""),
    start: row.start,
    end: row.end,
    building: row.building,
    room: row.room,
    source: "syllabus",
  };
}
