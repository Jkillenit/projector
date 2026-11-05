import { describe, expect, it } from "vitest";
import { askSuggestions, dueText, homeEvents, kindLabel, postedText, subtitleText, timeLeft, weekCells } from "./homeView.js";

const NOW = new Date(2026, 10, 2, 19, 0); // Monday 7 PM
const at = (days, h = 23, m = 59) => new Date(2026, 10, 2 + days, h, m).toISOString();

describe("home view", () => {
  it("builds the subtitle and drops grades at 0", () => {
    expect(subtitleText(NOW, 1, 0)).toBe("Monday, November 2 · 1 thing due this week");
    expect(subtitleText(NOW, 6, 2)).toBe("Monday, November 2 · 6 things due this week · 2 new grades");
  });

  it("gives short time left", () => {
    expect(timeLeft(at(0), NOW)).toBe("5h");
    expect(timeLeft(at(2), NOW)).toBe("2d");
    expect(timeLeft(at(-1), NOW)).toBe("late");
  });

  it("says tonight for today and a weekday otherwise", () => {
    expect(dueText(at(0), NOW)).toEqual({ text: "Due 11:59 PM tonight", today: true });
    expect(dueText(at(6), NOW).text).toBe("Sun 11:59 PM");
  });

  it("names extra credit", () => {
    expect(kindLabel("assignment", "XC: UA AI Experience reflection")).toBe("Extra credit");
    expect(kindLabel("exam", "Exam 3")).toBe("Exam");
  });

  it("lays out Monday to Sunday with today marked", () => {
    const cells = weekCells([{ due_date: at(6), course_uuid: "m" }], NOW);
    expect(cells.map((c) => c.name)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(cells[0].isToday).toBe(true);
    expect(cells[6].items).toHaveLength(1);
  });

  it("suggests help from the student's own tasks", () => {
    const s = askSuggestions([{ code: "MKT 300", kind: "exam", title: "Exam 2" }, { code: "GBA 490", kind: "assignment", title: "Case 3 write-up" }], ["coding"]);
    expect(s).toEqual(["Study help before my MKT 300 exam", "Someone to read my GBA 490 case", "Find a club for coding"]);
  });

  it("says when a grade posted", () => {
    expect(postedText("Exam 5", at(0, 9, 0), NOW)).toBe("Exam 5 posted today");
  });
});

describe("homeEvents", () => {
  const ev = (id, text) => ({ id, title: text, text, start: `2026-11-0${id}T18:00:00` });
  const list = [ev(1, "Chess night"), ev(2, "Coding club hack night"), ev(3, "Open mic"), ev(4, "Robotics coding workshop")];

  it("puts your interests first, keeps date order, caps at n", () => {
    expect(homeEvents(list, ["coding"], 3).map((e) => e.id)).toEqual([2, 4, 1]);
  });

  it("marks which of your interests each event matches", () => {
    expect(homeEvents(list, ["coding"], 3).map((e) => e.match)).toEqual([["coding"], ["coding"], []]);
  });

  it("falls back to date order with no interests", () => {
    expect(homeEvents(list, [], 2).map((e) => e.id)).toEqual([1, 2]);
  });

  it("handles no events", () => {
    expect(homeEvents([], ["coding"])).toEqual([]);
  });
});
