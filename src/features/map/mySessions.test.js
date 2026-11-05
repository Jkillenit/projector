import { describe, expect, it } from "vitest";
import { asMeeting, makeSession, parseSessions, upcomingSessions } from "./mySessions.js";

const NOW = new Date(2026, 10, 4, 15, 0); // Wed Nov 4, 2026, 3 PM local
const good = { kind: "tutoring", title: " Calc II tutor ", date: "2026-11-05", start: "15:00", end: "16:00", where: "Gorgas Library", room: "205" };

describe("my sessions", () => {
  it("makes a session from the form, trimmed", () => {
    const res = makeSession(good, NOW, "ses_1");
    expect(res).toEqual({ ok: true, session: { id: "ses_1", kind: "tutoring", title: "Calc II tutor", date: "2026-11-05", start: "15:00", end: "16:00", where: "Gorgas Library", room: "205" } });
  });

  it("says plainly what is missing or wrong", () => {
    expect(makeSession({ ...good, title: " " }, NOW).error).toBe("Say what the session is.");
    expect(makeSession({ ...good, date: "" }, NOW).error).toBe("Pick a day.");
    expect(makeSession({ ...good, start: "3pm" }, NOW).error).toBe("Pick a start time.");
    expect(makeSession({ ...good, end: "14:00" }, NOW).error).toBe("The end time has to be after the start.");
    expect(makeSession({ ...good, date: "2026-11-03" }, NOW).error).toBe("That day has already passed.");
    expect(makeSession({ ...good, where: "" }, NOW).error).toMatch(/Say where/);
    expect(makeSession({ ...good, kind: "party" }, NOW, "x").session.kind).toBe("other");
  });

  it("keeps sessions that have not ended, soonest first, and reads saved text safely", () => {
    const list = [
      { id: "a", date: "2026-11-04", start: "13:00", end: "14:00" }, // ended
      { id: "b", date: "2026-11-04", start: "14:30", end: null }, // no end: counts as an hour, so on until 3:30
      { id: "c", date: "2026-11-06", start: "09:00", end: "10:00" },
      { id: "d", date: "2026-11-05", start: "12:00", end: "13:00" },
    ];
    expect(upcomingSessions(list, NOW).map((s) => s.id)).toEqual(["b", "d", "c"]);
    expect(parseSessions(JSON.stringify(list)).length).toBe(4);
    expect(parseSessions("not json")).toEqual([]);
    expect(parseSessions(JSON.stringify([{ id: "x", date: "soon" }]))).toEqual([]);
  });

  it("shows on the map like a class, marked as a session", () => {
    expect(asMeeting(makeSession(good, NOW, "ses_1").session)).toMatchObject({ course: "Calc II tutor", building: "Gorgas Library", room: "205", session: true, kind: "tutoring" });
  });
});
