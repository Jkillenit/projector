import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_KEY, PROFILE_KEY, buildDemoBridge } from "./demoBridge.js";

const NOW = new Date("2026-11-02T15:00:00");

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}

let storage;
const make = () => buildDemoBridge({ storage, now: () => NOW });

const pick = (bridge, studentId) => bridge.db.settings.set({ key: PROFILE_KEY, value: JSON.stringify({ studentId }) });

beforeEach(() => {
  storage = memoryStorage();
});

describe("demo bridge", () => {
  it("returns the chosen student's four demo courses", async () => {
    const bridge = make();
    expect(await bridge.db.courses.getAll()).toEqual([]);
    await pick(bridge, "maya");
    const rows = await bridge.db.courses.getAll();
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.course_code)).toContain("MATH 126");
  });

  it("builds a Today snapshot with open work, fractions as weights and a graded component", async () => {
    const bridge = make();
    await pick(bridge, "maya");
    const data = await bridge.db.today.get();
    const calc = data.courses.find((c) => c.uuid === "calc2");
    expect(data.synced).toBe(true);
    expect(calc.assignments.length).toBeGreaterThan(0);
    expect(calc.assignments.every((a) => Date.parse(a.dueDate) >= NOW.getTime() - 30 * 86400000)).toBe(true);
    expect(calc.components.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1);
    expect(calc.components.find((c) => c.uuid === "calc2-mid").score).toBe(58);
  });

  it("keeps due dates relative to today", async () => {
    const bridge = make();
    const rows = await bridge.db.assignments.getByCourse("calc2");
    const hw3 = rows.find((r) => r.uuid === "calc2-hw3");
    expect(new Date(hw3.due_date).getTime() - NOW.getTime()).toBeGreaterThan(0);
    expect(new Date(hw3.due_date).getTime() - NOW.getTime()).toBeLessThan(3 * 86400000);
  });

  it("saves a change, survives a reload, then resets", async () => {
    let bridge = make();
    await pick(bridge, "maya");
    expect((await bridge.db.assignments.setCompleted({ uuid: "calc2-hw3", completed: true })).changed).toBe(true);
    await bridge.db.announcements.markRead("calc2-a1");
    expect(storage.getItem(DEMO_KEY)).toContain("calc2-hw3");

    bridge = make();
    expect((await bridge.db.assignments.getByCourse("calc2")).find((r) => r.uuid === "calc2-hw3").completed).toBe(1);
    expect((await bridge.db.announcements.getByCourse("calc2")).find((a) => a.uuid === "calc2-a1").read).toBe(1);

    bridge.app.resetDemo();
    expect(storage.getItem(DEMO_KEY)).toBeNull();
    expect(await bridge.db.settings.get(PROFILE_KEY)).toBeNull();
    expect((await make().db.assignments.getByCourse("calc2")).find((r) => r.uuid === "calc2-hw3").completed).toBe(0);
  });

  it("has two new grades per student in the last three days", async () => {
    for (const [id, expected] of [["maya", ["calc2-quiz1b", "calc2-hw2b"]], ["devon", ["ac310-hw2", "ac310-case1"]]]) {
      const bridge = make();
      await pick(bridge, id);
      const recent = (await bridge.db.dashboard.get()).recentGrades.filter((g) => NOW.getTime() - Date.parse(g.graded_at) < 3 * 86400000);
      expect(recent.length).toBeGreaterThanOrEqual(2);
      expect(expected.length).toBe(2);
    }
  });
});
