import { describe, expect, it } from "vitest";
import campus from "./campus.json";
import { classPins, classWhen, classWhere, classesInRange, tomorrowWalks, walkTo } from "./classLayer.js";
import demoHall from "../../demo/indoor/demo-hall.indoor.json";

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

  it("never pins an online class to a building", () => {
    const online = { course: "CS 101", date: "2026-11-04", start: "10:00", end: "11:00", building: "Online", room: "" };
    expect(classPins([online], places)).toEqual({ pins: [], unplaced: [online] });
  });

  it("writes the time and place plainly", () => {
    expect(classWhen(meetings[0], "today")).toBe("9:00 AM to 9:50 AM");
    expect(classWhen(meetings[3], "week")).toBe("Fri 2:00 PM to 3:15 PM");
    expect(classWhere(meetings[0])).toBe("GBA 490 · Bidgood Hall 116");
  });
});

describe("walkTo", () => {
  const indoor = [demoHall];
  it("goes to the room when we have the inside of the building", () => {
    expect(walkTo({ building: "Demo Hall", room: "216" }, indoor)).toEqual({ building: "demo-hall", room: "216", label: "Walk me to Room 216" });
    expect(walkTo({ building: "Demo Hall 105" }, indoor)).toEqual({ building: "demo-hall", room: "105", label: "Walk me to Room 105" });
  });
  it("says why when it cannot", () => {
    expect(walkTo({ building: "Bidgood Hall", room: "116" }, indoor)).toEqual({ reason: "We don't have the inside of this building yet" });
    expect(walkTo({ building: "Demo Hall", room: "999" }, indoor).reason).toBe("We can't find room 999 in Demo Hall");
    expect(walkTo({ building: "Online", room: "" }, indoor).reason).toBe("This class has no room to walk to");
  });
});

describe("tomorrow's walks (#72)", () => {
  const indoor = [demoHall];
  const week = [
    { course: "MATH 125", date: "2026-11-05", start: "09:00", end: "09:50", building: "Demo Hall", room: "216" },
    { course: "MGT 300", date: "2026-11-05", start: "11:00", end: "11:50", building: "Demo Hall", room: "105" },
    { course: "MGT 300", date: "2026-11-05", start: "08:00", end: "08:50", building: "Demo Hall", room: "105" },
    { course: "FI 302", date: "2026-11-05", start: "09:30", end: "10:45", building: "Bidgood Hall", room: "116" },
    { course: "MATH 125", date: "2026-11-04", start: "09:00", end: "09:50", building: "Demo Hall", room: "216" },
  ];

  it("keeps tomorrow's classes we can walk to, soonest first, one per room", () => {
    expect(tomorrowWalks(week, indoor, NOW).map((w) => `${w.m.start} ${w.m.course} ${w.walk.room}`)).toEqual(["08:00 MGT 300 105", "09:00 MATH 125 216"]);
  });

  it("is empty when tomorrow has nothing we have the inside of", () => {
    expect(tomorrowWalks(week.slice(3), indoor, NOW)).toEqual([]);
    expect(tomorrowWalks(week, [], NOW)).toEqual([]);
    expect(tomorrowWalks(undefined, indoor, NOW)).toEqual([]);
  });
});
