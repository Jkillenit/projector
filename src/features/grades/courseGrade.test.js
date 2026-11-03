import { describe, expect, it } from "vitest";
import { computeCourseGrade } from "./courseGrade.js";
import { BASIS } from "./gradesView.js";

const NOW = new Date(2026, 8, 30, 9, 0).toISOString();
const comp = (uuid, name, weight, category = "other") => ({ uuid, name, weight, category, score: null, pointsTotal: 0, itemCount: 0 });
const item = (bb_id, componentUuid, score, points_possible) => ({ bb_id, name: bb_id, componentUuid, score, points_possible, excluded: false });
const snapshot = {
  uuid: "c1",
  targetGrade: 80,
  components: [comp("q", "Quizzes", 0.4, "quiz"), comp("f", "Final", 0.6, "exam")],
  assignments: [{ uuid: "fin", title: "Final", kind: "exam", dueDate: new Date(2026, 9, 10).toISOString(), score: null, pointsPossible: 100, componentUuid: "f" }],
};
const quizzes = [item("a", "q", 10, 10), item("b", "q", 5, 10), item("c", "q", 9, 10)];

describe("computeCourseGrade", () => {
  it("weights components by points earned over possible", () => {
    const g = computeCourseGrade({ snapshot, graded: quizzes, now: NOW });
    expect(g.current).toBeCloseTo(80); // 24/30 on quizzes, final unscored
    expect(g.basis).toBe(BASIS.weights);
    expect(g.letter).toBe("B");
  });

  it("leaves out the lowest scores a drop rule names, but keeps at least one", () => {
    const g = computeCourseGrade({ snapshot, graded: quizzes, drops: { q: 1 }, now: NOW });
    expect(g.current).toBeCloseTo(95);
    expect(g.rows[0].dropped.has("b")).toBe(true);
    expect(computeCourseGrade({ snapshot, graded: quizzes, drops: { q: 9 }, now: NOW }).current).toBeCloseTo(100);
  });

  it("counts a typed what-if score on open work and leaves it out of the needed score", () => {
    const base = computeCourseGrade({ snapshot, graded: quizzes, now: NOW });
    expect(base.needs.final.needed).toBeCloseTo(80);
    const hypo = computeCourseGrade({ snapshot, graded: quizzes, whatIf: { fin: 100 }, now: NOW });
    expect(hypo.current).toBeCloseTo(92); // 0.4*80 + 0.6*100
    expect(hypo.rows[1].items[0].hypo).toBe(true);
  });

  it("falls back to Blackboard's overall column, then to points, and says which", () => {
    const none = { ...snapshot, components: [] };
    const overall = computeCourseGrade({ snapshot: none, graded: quizzes, overall: { score: 88, possible: 100 }, now: NOW });
    expect(overall.current).toBe(88);
    expect(overall.basis).toBe(BASIS.overall);
    const points = computeCourseGrade({ snapshot: none, graded: quizzes, now: NOW });
    expect(points.current).toBeCloseTo(80);
    expect(points.basis).toBe(BASIS.points);
    expect(points.hasWeights).toBe(false);
  });

  it("has no grade before anything is scored", () => {
    const g = computeCourseGrade({ snapshot, now: NOW });
    expect(g.current).toBeNull();
    expect(g.basis).toBeNull();
  });
});
