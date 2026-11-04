/**
 * myBama (Banner Student Self-Service) Week at a Glance: the request and the converter. Pure, so it is tested without Electron.
 * Learned from the probe (2026-11-04): GET ...fetchStudentWeekAtAGlanceData?start_date_in=MM/DD/YYYY. Each classList item is
 * one meeting, with startEndMonth counted from 0, times as 24-hour "HHMM", and full building names.
 * Only class fields are kept. The student's name and Banner ID in the answer are dropped here and never leave this file.
 */
const WEEK_PAGE = "https://bannerssb.ua.edu/StudentSelfService/ssb/weekAtAGlance";
const WEEK_DATA = `${WEEK_PAGE}/fetchStudentWeekAtAGlanceData`;

const pad = (n) => String(n).padStart(2, "0");

/** The Monday of the week `date` is in, local time. Banner weeks start Monday (workStartDay 1). */
function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The data URL for the week `date` is in. */
function weekUrl(date = new Date()) {
  const m = mondayOf(date);
  return `${WEEK_DATA}?start_date_in=${encodeURIComponent(`${pad(m.getMonth() + 1)}/${pad(m.getDate())}/${m.getFullYear()}`)}`;
}

/** "0900" → "09:00"; anything else → null. */
const hhmm = (s) => (/^\d{4}$/.test(String(s || "")) && Number(s.slice(0, 2)) < 24 && Number(s.slice(2)) < 60 ? `${s.slice(0, 2)}:${s.slice(2)}` : null);

/** Banner's year, 0-based month and day → "2026-11-02"; null when out of range. */
function ymd(year, month0, day) {
  const y = Number(year);
  const m = Number(month0);
  const d = Number(day);
  if (!(y > 2000 && m >= 0 && m <= 11 && d >= 1 && d <= 31)) return null;
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

const text = (s) => String(s ?? "").trim();
const courseOf = (sub, num) => [text(sub), text(num)].filter(Boolean).join(" ");

/** The Week at a Glance answer → { weekStart, meetings, noMeetingTime }, or null if it is not a schedule. */
function fromWeekAtAGlance(json, weekStart = null) {
  if (!json || typeof json !== "object" || json.success === false || !Array.isArray(json.classList)) return null;
  const meetings = json.classList
    .map((c) => ({
      course: courseOf(c.classSubCode, c.classCourseNumber),
      title: text(c.classCourseDisplay),
      crn: text(c.classCrn),
      section: text(c.classSeqNumber),
      type: text(c.classType),
      date: ymd(c.startEndYear, c.startEndMonth, c.startEndDay),
      start: hhmm(c.classStartTime),
      end: hhmm(c.classEndTime),
      building: text(c.classBuilding),
      room: text(c.classRoomCode),
    }))
    .filter((m) => m.course && m.date && m.start)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const noMeetingTime = (json.coursesWithOutMeetingTimes || [])
    .map((w) => ({ course: courseOf(w.woatSubCode, w.woatCourseNumber), title: text(w.woatCourseDisplay), crn: text(w.woatCrn), note: text(w.woaText) }))
    .filter((w) => w.course);
  return { weekStart, meetings, noMeetingTime };
}

module.exports = { WEEK_PAGE, WEEK_DATA, mondayOf, ymdOf, weekUrl, hhmm, ymd, fromWeekAtAGlance };
