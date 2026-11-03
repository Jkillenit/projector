import { describe, expect, it } from "vitest";
import { groupAssignments, isDone } from "./assignmentState.js";

const now = new Date("2026-11-02T12:00:00Z");
const a = (title, due_date, extra = {}) => ({ title, due_date, ...extra });

describe("isDone", () => {
  it("counts a tick, a submission or a score", () => {
    expect(isDone(a("x", null, { completed: 1 }))).toBe(true);
    expect(isDone(a("x", null, { submitted: 1 }))).toBe(true);
    expect(isDone(a("x", null, { score: 0 }))).toBe(true);
    expect(isDone(a("x", null, { score: null, submitted: 0, completed: 0 }))).toBe(false);
  });
});

describe("groupAssignments", () => {
  it("splits into to do (soonest first), missing and done", () => {
    const g = groupAssignments(
      [
        a("later", "2026-11-09T12:00:00Z"),
        a("soon", "2026-11-03T12:00:00Z"),
        a("undated", null),
        a("late", "2026-10-30T12:00:00Z"),
        a("later-miss", "2026-11-01T12:00:00Z"),
        a("sent", "2026-10-20T12:00:00Z", { submitted: 1 }),
      ],
      now
    );
    expect(g.todo.map((x) => x.title)).toEqual(["soon", "later", "undated"]);
    expect(g.missing.map((x) => x.title)).toEqual(["later-miss", "late"]);
    expect(g.done.map((x) => x.title)).toEqual(["sent"]);
  });

  it("never lists a scored item as missing", () => {
    const g = groupAssignments([a("graded", "2026-10-01T12:00:00Z", { score: 9 })], now);
    expect(g.missing).toEqual([]);
    expect(g.done).toHaveLength(1);
  });
});
