import { describe, expect, it } from "vitest";
import { meetingFromForm, meetingKey, meetingLabel, readMeeting, scheduleToMeeting, shouldSaveSyllabusMeeting } from "./courseMeeting.js";

const inPerson = { mode: "in_person", days: "MWF", start: "09:00", end: "09:50", building: "Bidgood Hall", room: "116" };

describe("meetingKey", () => {
  it("is one setting per course", () => {
    expect(meetingKey("calc2")).toBe("course.meeting.calc2");
  });
});

describe("meetingLabel", () => {
  it("says the days, times and room for an in-person class", () => {
    expect(meetingLabel(inPerson)).toBe("Meets Mon, Wed, Fri, 9:00 AM to 9:50 AM, in Bidgood Hall 116");
  });

  it("uses Thu for R and afternoon times", () => {
    expect(meetingLabel({ ...inPerson, days: "TR", start: "14:00", end: "15:15" })).toBe("Meets Tue, Thu, 2:00 PM to 3:15 PM, in Bidgood Hall 116");
  });

  it("says where only, when the time is not known", () => {
    expect(meetingLabel({ ...inPerson, days: "", start: null, end: null })).toBe("Meets in Bidgood Hall 116");
  });

  it("says online at set times", () => {
    expect(meetingLabel({ mode: "online_sync", days: "MW", start: "10:00", end: "11:15", building: "", room: "" })).toBe("Online, Mon, Wed, 10:00 AM to 11:15 AM");
  });

  it("says online with no set meeting time", () => {
    expect(meetingLabel({ mode: "online_async" })).toBe("Online, no set meeting time");
  });

  it("says both for a hybrid class", () => {
    expect(meetingLabel({ ...inPerson, mode: "hybrid" })).toBe("Meets Mon, Wed, Fri, 9:00 AM to 9:50 AM, in Bidgood Hall 116 and online");
  });

  it("is empty when we do not know", () => {
    expect(meetingLabel(null)).toBe("");
    expect(meetingLabel({ mode: "unknown" })).toBe("");
  });
});

describe("readMeeting", () => {
  it("reads a saved meeting", () => {
    expect(readMeeting(JSON.stringify({ ...inPerson, source: "manual" }))).toEqual({ ...inPerson, source: "manual" });
  });

  it("returns null for missing, broken or odd data", () => {
    expect(readMeeting(null)).toBeNull();
    expect(readMeeting("{not json")).toBeNull();
    expect(readMeeting(JSON.stringify({ mode: "teleport" }))).toBeNull();
    expect(readMeeting("[]")).toBeNull();
  });
});

describe("shouldSaveSyllabusMeeting", () => {
  it("saves what the syllabus found when nothing is saved", () => {
    expect(shouldSaveSyllabusMeeting(null, inPerson)).toBe(true);
  });

  it("never replaces a meeting the student fixed by hand", () => {
    expect(shouldSaveSyllabusMeeting({ ...inPerson, source: "manual" }, { ...inPerson, room: "999" })).toBe(false);
  });

  it("does not save when the syllabus did not say", () => {
    expect(shouldSaveSyllabusMeeting(null, { mode: "unknown" })).toBe(false);
  });
});

describe("meetingFromForm", () => {
  it("makes a manual meeting from the form", () => {
    expect(meetingFromForm({ mode: "in_person", days: ["F", "M", "W"], start: "09:00", end: "09:50", building: " Bidgood Hall ", room: " 116 " })).toEqual({
      meeting: { ...inPerson, source: "manual" },
    });
  });

  it("asks for a building for an in-person class", () => {
    expect(meetingFromForm({ mode: "in_person", days: ["M"], start: "09:00", end: "09:50", building: "", room: "" })).toEqual({ error: "Add the building." });
  });

  it("asks for days and a start time for a class at set times", () => {
    expect(meetingFromForm({ mode: "online_sync", days: [], start: "", end: "", building: "", room: "" })).toEqual({ error: "Pick the days it meets." });
    expect(meetingFromForm({ mode: "online_sync", days: ["M"], start: "", end: "", building: "", room: "" })).toEqual({ error: "Add the start time." });
  });

  it("rejects an end time before the start", () => {
    expect(meetingFromForm({ mode: "in_person", days: ["M"], start: "10:00", end: "09:00", building: "Lloyd Hall", room: "" })).toEqual({ error: "The class has to end after it starts." });
  });

  it("drops days, times and place for a self-paced class", () => {
    expect(meetingFromForm({ mode: "online_async", days: ["M"], start: "09:00", end: "", building: "Lloyd Hall", room: "1" })).toEqual({
      meeting: { mode: "online_async", days: "", start: null, end: null, building: "", room: "", source: "manual" },
    });
  });
});

describe("scheduleToMeeting", () => {
  it("turns a demo schedule row into a meeting", () => {
    expect(scheduleToMeeting({ days: [1, 3, 5], start: "09:00", end: "09:50", building: "Bidgood Hall", room: "116" })).toEqual({ ...inPerson, source: "syllabus" });
  });

  it("turns an online row into a self-paced meeting", () => {
    expect(scheduleToMeeting({ online: true, note: "WEB" })).toEqual({ mode: "online_async", days: "", start: null, end: null, building: "", room: "", source: "syllabus" });
  });

  it("returns null for no row", () => {
    expect(scheduleToMeeting(undefined)).toBeNull();
  });
});
