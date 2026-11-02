import { describe, expect, it } from "vitest";
import { buildTodayView, dueText, letterFor, tonightReason } from "./todayView.js";
import { ITEM_TYPES } from "./priority.js";

const NOW = new Date(2026, 8, 30, 0, 12).toISOString();
const at = (dayOffset, hour = 23, min = 59) => new Date(2026, 8, 30 + dayOffset, hour, min).toISOString();

let seq = 0;
function asg(overrides = {}) {
  seq += 1;
  return { uuid: `a${seq}`, title: `Item ${seq}`, kind: "assignment", dueDate: at(3), score: null, pointsPossible: null, url: null, componentUuid: null, ...overrides };
}

function course(overrides = {}) {
  return { uuid: "c1", name: "MIS 430", courseCode: "MIS 430", targetGrade: 80, cardsTotal: 0, cardsDue: 0, components: [], assignments: [], ...overrides };
}

const graded = (score) => [
  { uuid: "g1", name: "Homework", weight: 0.5, category: "homework", score, pointsTotal: 0, itemCount: 0 },
  { uuid: "g2", name: "Final", weight: 0.5, category: "exam", score: null, pointsTotal: 0, itemCount: 0 },
];

describe("letterFor", () => {
  it("uses the default 90/80/70/60 scale without a syllabus scale", () => {
    expect(letterFor(80, null)).toBe("B");
    expect(letterFor(79.9, null)).toBe("C");
    expect(letterFor(null, null)).toBeNull();
  });

  it("honors a course scale", () => {
    expect(letterFor(80, { A: 93, "A-": 90, "B+": 87, B: 83, "B-": 80 })).toBe("B-");
  });
});

describe("buildTodayView", () => {
  it("keeps overdue items out of Tonight and lists them in the overdue strip", () => {
    const late = asg({ title: "Late one", dueDate: at(-3) });
    const soon = asg({ title: "Soon", dueDate: at(0, 10, 0) });
    const view = buildTodayView({ now: NOW, synced: true, courses: [course({ assignments: [late, soon] })] }, { now: NOW });
    expect(view.tonight.map((t) => t.title)).toEqual(["Soon"]);
    expect(view.overdue).toEqual([expect.objectContaining({ title: "Late one", daysLate: 3, courseLabel: "MIS 430" })]);
  });

  it("caps Tonight at three and never includes a course-level grade risk", () => {
    const items = [0, 1, 2, 3, 4].map((d) => asg({ dueDate: at(d) }));
    const view = buildTodayView({ now: NOW, courses: [course({ components: graded(60), assignments: items })] }, { now: NOW });
    expect(view.tonight).toHaveLength(3);
    expect(view.tonight.every((t) => t.type !== "GRADE_RISK")).toBe(true);
  });

  it("tags week items that are already in Tonight instead of repeating them", () => {
    const a = asg({ title: "Case", dueDate: at(2) });
    const view = buildTodayView({ now: NOW, courses: [course({ assignments: [a] })] }, { now: NOW });
    expect(view.week.days).toHaveLength(7);
    expect(view.week.days[0].isToday).toBe(true);
    expect(view.week.days[2].dots).toHaveLength(1);
    expect(view.week.later).toEqual([expect.objectContaining({ title: "Case", inTonight: true })]);
  });

  it("colors course state from standing", () => {
    const view = buildTodayView(
      {
        now: NOW,
        courses: [
          course({ uuid: "low", courseCode: "MKT 300", components: graded(73.3) }),
          course({ uuid: "high", courseCode: "CS 200", components: graded(91) }),
          course({ uuid: "new", courseCode: "FIN 310" }),
        ],
      },
      { now: NOW }
    );
    expect(view.states).toEqual({ low: "warn", high: "ok", new: "none" });
    expect(view.standing.courses[0]).toEqual(expect.objectContaining({ label: "MKT 300", targetLetter: "B" }));
    expect(view.standing.uniformTarget).toBe(80);
  });

  it("handles zero courses", () => {
    const view = buildTodayView({ now: NOW, synced: false, courses: [] }, { now: NOW });
    expect(view.hasCourses).toBe(false);
    expect(view.tonight).toEqual([]);
    expect(view.overdue).toEqual([]);
    expect(view.standing.courses).toEqual([]);
  });

  it("passes the last sync time through", () => {
    expect(buildTodayView({ now: NOW, courses: [], syncedAt: "2026-10-01 17:58:00" }, { now: NOW }).syncedAt).toBe("2026-10-01 17:58:00");
    expect(buildTodayView({ now: NOW, courses: [] }, { now: NOW }).syncedAt).toBeNull();
  });
});
