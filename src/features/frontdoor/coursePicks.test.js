import { describe, expect, it } from "vitest";
import { coursePicks } from "./coursePicks.js";

const NOW = new Date(2026, 10, 2, 9, 0); // Monday
const at = (days) => new Date(2026, 10, 2 + days, 12).toISOString();
const resources = [
  { id: "center-for-academic-success", name: "Center for Academic Success" },
  { id: "ingenuity-lab-tutoring", name: "Ingenuity Lab tutoring" },
  { id: "writing-center", name: "Writing center" },
];

describe("coursePicks", () => {
  it("ties an upcoming exam to the course and the right office", () => {
    const picks = coursePicks(
      [
        { id: "m", code: "MKT 300", current: 90, target: 80, items: [{ title: "Midterm", kind: "exam", dueDate: at(6) }] },
        { id: "c", code: "MATH 126", current: 90, target: 80, items: [{ title: "Exam 2", kind: "exam", dueDate: at(1) }] },
      ],
      resources,
      { now: NOW }
    );
    expect(picks.map((p) => p.text)).toEqual(["MKT 300 exam Sunday → Center for Academic Success", "MATH 126 exam tomorrow → Ingenuity Lab tutoring"]);
  });

  it("offers the writing center for a paper and help when the grade is under target", () => {
    const picks = coursePicks(
      [
        { id: "e", code: "ENGL 101", current: 91, target: 80, items: [{ title: "Essay draft", kind: "assignment", dueDate: at(3) }] },
        { id: "a", code: "AC 310", current: 70.4, target: 80, items: [] },
      ],
      resources,
      { now: NOW }
    );
    expect(picks.map((p) => p.text)).toEqual(["ENGL 101 Essay draft due Thursday → Writing center", "AC 310 under your target → Center for Academic Success"]);
  });

  it("says nothing when nothing in the student's classes calls for help", () => {
    expect(coursePicks([{ id: "m", code: "MKT 300", current: 88, target: 80, items: [{ title: "Quiz", kind: "quiz", dueDate: at(30) }] }], resources, { now: NOW })).toEqual([]);
  });
});
