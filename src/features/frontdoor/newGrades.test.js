import { describe, expect, it } from "vitest";
import { lastVisitOrDefault, newGradesSince, scoreText } from "./newGrades.js";

const rows = [
  { name: "Quiz", score: 8, points_possible: 10, graded_at: "2026-11-01T10:00:00Z" },
  { name: "Exam", score: 58, points_possible: 100, graded_at: "2026-10-28T10:00:00Z" },
  { name: "HW", score: 15, points_possible: 20, graded_at: "2026-11-02T08:00:00Z" },
  { name: "Ungraded", score: null, points_possible: 10, graded_at: "2026-11-02T09:00:00Z" },
];

describe("newGradesSince", () => {
  it("keeps only graded items after the last visit, newest first", () => {
    expect(newGradesSince(rows, "2026-10-30T00:00:00Z").map((g) => g.name)).toEqual(["HW", "Quiz"]);
  });
  it("shows everything graded when there is no valid last visit", () => {
    expect(newGradesSince(rows, null)).toHaveLength(3);
    expect(newGradesSince(undefined, "x")).toEqual([]);
  });
});

describe("helpers", () => {
  it("words a score", () => {
    expect(scoreText(rows[0])).toBe("8/10 (80%)");
    expect(scoreText({ score: 5 })).toBe("5");
  });
  it("defaults a first visit to four days ago", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    expect(lastVisitOrDefault(null, now)).toBe("2026-10-29T12:00:00.000Z");
    expect(lastVisitOrDefault("2026-11-01T00:00:00Z", now)).toBe("2026-11-01T00:00:00Z");
  });
});
