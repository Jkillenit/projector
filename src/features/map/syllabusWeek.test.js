import { describe, expect, it } from "vitest";
import { syllabusWeek } from "./syllabusWeek.js";

const NOW = new Date("2026-11-04T15:00:00"); // a Wednesday
const courses = [
  { uuid: "fi302", course_code: "FI 302", name: "Finance" },
  { uuid: "mkt300", course_code: "MKT 300", name: "Marketing" },
  { uuid: "cs101", course_code: "CS 101", name: "Intro CS" },
  { uuid: "orgs", course_code: "ORG", name: "Bama Bound" },
];
const fi302 = { mode: "in_person", days: "TR", start: "09:30", end: "10:45", building: "Bidgood Hall", room: "116", source: "syllabus" };

describe("syllabusWeek", () => {
  it("puts each in-person meeting on its day this week, Monday to Friday", () => {
    const week = syllabusWeek(courses, { fi302 }, NOW);
    expect(week.ok).toBe(true);
    expect(week.source).toBe("syllabus");
    expect(week.weekStart).toBe("2026-11-02");
    expect(week.meetings).toEqual([
      { course: "FI 302", title: "Finance", date: "2026-11-03", start: "09:30", end: "10:45", building: "Bidgood Hall", room: "116" },
      { course: "FI 302", title: "Finance", date: "2026-11-05", start: "09:30", end: "10:45", building: "Bidgood Hall", room: "116" },
    ]);
  });

  it("starts the week on Monday even on a Sunday", () => {
    expect(syllabusWeek(courses, { fi302 }, new Date("2026-11-08T12:00:00")).weekStart).toBe("2026-11-02");
  });

  it("lists online classes with no set time, and does not place them", () => {
    const week = syllabusWeek(courses, { mkt300: { mode: "online_async" } }, NOW);
    expect(week.meetings).toEqual([]);
    expect(week.noMeetingTime).toEqual([{ course: "MKT 300", title: "Marketing", note: "Online" }]);
  });

  it("lists online classes at set times as Online, so they are never pinned to a building", () => {
    const week = syllabusWeek(courses, { cs101: { mode: "online_sync", days: "M", start: "10:00", end: "11:00" } }, NOW);
    expect(week.meetings).toEqual([{ course: "CS 101", title: "Intro CS", date: "2026-11-02", start: "10:00", end: "11:00", building: "Online", room: "" }]);
  });

  it("keeps a hybrid class at its building", () => {
    const week = syllabusWeek(courses, { fi302: { ...fi302, mode: "hybrid", days: "T" } }, NOW);
    expect(week.meetings).toMatchObject([{ date: "2026-11-03", building: "Bidgood Hall", room: "116" }]);
  });

  it("lists a class with a room but no time instead of guessing a day", () => {
    const week = syllabusWeek(courses, { fi302: { ...fi302, days: "", start: null, end: null } }, NOW);
    expect(week.meetings).toEqual([]);
    expect(week.noMeetingTime).toEqual([{ course: "FI 302", title: "Finance", note: "Bidgood Hall 116" }]);
  });

  it("names the courses we know nothing about yet", () => {
    expect(syllabusWeek(courses, { fi302, mkt300: { mode: "online_async" } }, NOW).unknown).toEqual(["CS 101", "ORG"]);
  });
});
