import { describe, expect, it } from "vitest";
import { EXAM_DAYS, riskOf } from "./atRisk.js";

const NOW = new Date(2026, 10, 2, 9, 0); // Monday, Nov 2
const at = (days) => new Date(2026, 10, 2 + days, 12).toISOString();
const course = (over) => ({ id: "c", code: "MATH 126", current: 85, target: 80, items: [], ...over });

describe("riskOf", () => {
  it("is not at risk at or above target with no exam soon", () => {
    expect(riskOf(course(), { now: NOW })).toEqual({ atRisk: false, reasons: [] });
    expect(riskOf(course({ current: 80 }), { now: NOW }).atRisk).toBe(false);
  });

  it("is at risk below target", () => {
    expect(riskOf(course({ current: 79.5 }), { now: NOW })).toEqual({ atRisk: true, reasons: ["under your target"] });
  });

  it("is at risk with an exam within 10 days, and says when", () => {
    expect(riskOf(course({ items: [{ title: "Midterm", kind: "exam", dueDate: at(1) }] }), { now: NOW }).reasons).toEqual(["exam tomorrow"]);
    expect(riskOf(course({ items: [{ title: "Midterm", kind: "exam", dueDate: at(4) }] }), { now: NOW }).reasons).toEqual(["exam Friday"]);
    expect(riskOf(course({ items: [{ title: "Final", kind: "exam", dueDate: at(EXAM_DAYS) }] }), { now: NOW }).atRisk).toBe(true);
  });

  it("ignores exams past the window, already over, or not exams", () => {
    const items = [
      { title: "Final", kind: "exam", dueDate: at(EXAM_DAYS + 1) },
      { title: "Old quiz", kind: "exam", dueDate: at(-1) },
      { title: "Homework", kind: "assignment", dueDate: at(1) },
    ];
    expect(riskOf(course({ items }), { now: NOW }).atRisk).toBe(false);
  });

  it("names both reasons, grade gap first, and uses the soonest exam", () => {
    const items = [
      { title: "Final", kind: "exam", dueDate: at(6) },
      { title: "Midterm", kind: "exam", dueDate: at(0) },
    ];
    expect(riskOf(course({ current: 70, items }), { now: NOW }).reasons).toEqual(["under your target", "exam today"]);
  });

  it("treats a class with no grade yet as on track unless an exam is close", () => {
    expect(riskOf(course({ current: null }), { now: NOW }).atRisk).toBe(false);
    expect(riskOf(course({ current: null, target: null }), { now: NOW }).atRisk).toBe(false);
  });

  it("never puts a grade, a percent or a letter in a reason", () => {
    const { reasons } = riskOf(course({ current: 41.2, target: 90, items: [{ title: "Exam 2", kind: "exam", dueDate: at(2) }] }), { now: NOW });
    for (const r of reasons) expect(r).not.toMatch(/\d|%|\b[A-F][+-]?\b/);
  });
});
