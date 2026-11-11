import { localDayKey } from "../../lib/dates.js";

const WEEKDAY = { M: 1, T: 2, W: 3, R: 4, F: 5 };

/**
 * This week's classes from the meetings saved per course (src/features/courses/courseMeeting.js),
 * for students who have not connected myBama. Same shape as the myBama week, so the map treats both alike.
 * `meetings` maps course uuid to its saved meeting.
 */
export function syllabusWeek(courses, meetings, now = new Date()) {
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const dayOf = (weekday) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + weekday - 1);
    return localDayKey(d);
  };

  const week = { ok: true, source: "syllabus", weekStart: dayOf(1), meetings: [], noMeetingTime: [], unknown: [] };
  for (const c of courses || []) {
    const m = meetings?.[c.uuid];
    const course = c.course_code || c.name;
    const title = c.name;
    if (!m || m.mode === "unknown") {
      week.unknown.push(course);
      continue;
    }
    if (m.mode === "online_async") {
      week.noMeetingTime.push({ course, title, note: "Online" });
      continue;
    }
    const online = m.mode === "online_sync";
    const building = online ? "Online" : m.building;
    const room = online ? "" : m.room || "";
    if (!m.days || !m.start) {
      week.noMeetingTime.push({ course, title, note: [building, room].filter(Boolean).join(" ") });
      continue;
    }
    for (const d of m.days) {
      if (WEEKDAY[d]) week.meetings.push({ course, title, date: dayOf(WEEKDAY[d]), start: m.start, end: m.end || null, building, room });
    }
  }
  week.meetings.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return week;
}
