import { describe, expect, it } from "vitest";
import campus from "./campus.json";
import { classPins, classWhen, classWhere, classesInRange } from "./classLayer.js";

const places = [...campus.buildings, ...campus.areas];
const NOW = new Date(2026, 10, 4, 8, 0); // Wed Nov 4, 2026, 8 AM local
const meetings = [
  { course: "GBA 490", date: "2026-11-02", start: "09:00", end: "09:50", building: "Bidgood Hall", room: "116" },
  { course: "MIS 430", date: "2026-11-04", start: "14:00", end: "15:15", building: "Alston Hall", room: "20" },
  { course: "GBA 490", date: "2026-11-04", start: "09:00", end: "09:50", building: "Bidgood Hall", room: "116" },
  { course: "MIS 430", date: "2026-11-06", start: "14:00", end: "15:15", building: "Alston Hall", room: "20" },
  { course: "XYZ 101", date: "2026-11-04", start: "11:00", end: "11:50", building: "Nowhere Annex", room: "1" },
];

describe("classes on the map", () => {
  it("picks today's classes, or this week's from today on, soonest first", () => {
    expect(classesInRange(meetings, "today", NOW).map((m) => `${m.start} ${m.course}`)).toEqual(["09:00 GBA 490", "11:00 XYZ 101", "14:00 MIS 430"]);
    expect(classesInRange(meetings, "week", NOW).map((m) => m.date)).toEqual(["2026-11-04", "2026-11-04", "2026-11-04", "2026-11-06"]);
  });

  it("groups classes by building, and lists the ones it cannot place instead of guessing", () => {
    const { pins, unplaced } = classPins(classesInRange(meetings, "today", NOW), places);
    expect(pins.map((p) => p.place.name).sort()).toEqual(["Alston Hall", "Bidgood Hall"]);
    expect(unplaced.map((m) => m.course)).toEqual(["XYZ 101"]);
  });

  it("writes the time and place plainly", () => {
    expect(classWhen(meetings[0], "today")).toBe("9:00 AM to 9:50 AM");
    expect(classWhen(meetings[3], "week")).toBe("Fri 2:00 PM to 3:15 PM");
    expect(classWhere(meetings[0])).toBe("GBA 490 · Bidgood Hall 116");
  });
});
