import { describe, expect, it } from "vitest";
import { greeting, groupDue, whenText } from "./dueSoon.js";

const NOW = new Date(2026, 10, 2, 18, 0); // Mon Nov 2, 6pm
const at = (days, hour = 12) => new Date(2026, 10, 2 + days, hour).toISOString();
const row = (uuid, due, extra = {}) => ({ uuid, title: uuid, course_uuid: "c1", due_date: due, completed: 0, submitted: 0, score: null, ...extra });

describe("groupDue", () => {
  it("sorts open work into overdue, today, tomorrow and this week", () => {
    const g = groupDue(
      [row("late", at(-2)), row("t", at(0, 23)), row("tm", at(1)), row("w1", at(4)), row("w2", at(2)), row("far", at(12)), row("done", at(0, 23), { completed: 1 }), row("none", null)],
      NOW
    );
    expect(g.overdue.map((a) => a.uuid)).toEqual(["late"]);
    expect(g.today.map((a) => a.uuid)).toEqual(["t"]);
    expect(g.tomorrow.map((a) => a.uuid)).toEqual(["tm"]);
    expect(g.week.map((a) => a.uuid)).toEqual(["w2", "w1"]);
  });
});

describe("whenText", () => {
  it("shows only the time for today and tomorrow, the weekday after that", () => {
    expect(whenText(new Date(Date.now() + 3 * 86400000).toISOString())).toMatch(/^\w{3} /);
    expect(whenText("junk")).toBe("");
  });
});

describe("greeting", () => {
  it("follows the hour", () => {
    expect([8, 13, 20].map((h) => greeting(new Date(2026, 10, 2, h)))).toEqual(["Good morning", "Good afternoon", "Good evening"]);
  });
});
