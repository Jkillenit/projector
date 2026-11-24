import { describe, expect, it } from "vitest";
import { eventsByDay, tagEvents } from "./calendarEvents.js";

const ev = (id, start, text, over) => ({ id, title: id, start, end: start, where: "Shelby Hall 1093", online: false, text, ...over });
const MON_6PM = new Date(2026, 10, 2, 18).toISOString();
const MON_9AM = new Date(2026, 10, 2, 9).toISOString();
const TUE_NOON = new Date(2026, 10, 3, 12).toISOString();

describe("tagEvents", () => {
  it("marks events that match the student's interests, with the reason", () => {
    const [hack, gala] = tagEvents([ev("Hack Night", MON_6PM, "coding gaming"), ev("Gala", TUE_NOON, "formal dinner")], ["coding", "music"]);
    expect(hack.match).toEqual(["coding"]);
    expect(hack.why).toBe("Matches your interest in coding");
    expect(gala.match).toEqual([]);
    expect(gala.why).toBeNull();
  });

  it("names two matches together", () => {
    const [e] = tagEvents([ev("Jam", MON_6PM, "music writing open mic")], ["music", "writing"]);
    expect(e.why).toBe("Matches your interest in music and writing");
  });

  it("handles no interests and no text", () => {
    expect(tagEvents([ev("A", MON_6PM, undefined)], undefined)[0].match).toEqual([]);
    expect(tagEvents(undefined, ["coding"])).toEqual([]);
  });
});

describe("eventsByDay", () => {
  it("groups by local day, soonest first in each day", () => {
    const days = eventsByDay([ev("late", MON_6PM, ""), ev("tue", TUE_NOON, ""), ev("early", MON_9AM, "")]);
    expect([...days.keys()]).toEqual(["2026-11-02", "2026-11-03"]);
    expect(days.get("2026-11-02").map((e) => e.id)).toEqual(["early", "late"]);
  });
});
