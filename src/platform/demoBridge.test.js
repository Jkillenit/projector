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
  it("pretends to connect services: off by default, only ready ones connect, disconnect clears", async () => {
    const bridge = make();
    const rows = await bridge.connections.list();
    expect(rows.every((r) => !r.connected)).toBe(true);
    expect(await bridge.connections.connect("tickets")).toMatchObject({ ok: false });
    expect(await bridge.connections.connect("mybama")).toEqual({ ok: true });
    expect((await bridge.connections.list()).find((r) => r.id === "mybama").connected).toBe(true);
    await bridge.connections.disconnect("mybama");
    expect((await bridge.connections.list()).find((r) => r.id === "mybama").connected).toBe(false);
  });

  it("gives a made-up myBama week only after connecting, for the student's own courses", async () => {
    const bridge = make();
    await pick(bridge, "maya");
    expect(await bridge.connections.mybamaWeek()).toEqual({ ok: false, notConnected: true });
    await bridge.connections.connect("mybama");
    const week = await bridge.connections.mybamaWeek();
    const codes = (await bridge.db.courses.getAll()).map((c) => c.course_code);
    expect(week.weekStart).toBe("2026-11-02");
    expect(week.meetings.length).toBeGreaterThan(0);
    expect(week.meetings.every((m) => codes.includes(m.course) && m.date >= "2026-11-02" && m.date <= "2026-11-06" && m.building)).toBe(true);
  });

  it("knows where each demo course meets, as if from its syllabus", async () => {
    const bridge = make();
    expect(JSON.parse(await bridge.db.settings.get("course.meeting.fi302"))).toMatchObject({ mode: "in_person", days: "TR", building: "Bidgood Hall", room: "116" });
    expect(JSON.parse(await bridge.db.settings.get("course.meeting.mkt300"))).toMatchObject({ mode: "online_async" });
    expect(await bridge.db.settings.get("course.meeting.nope")).toBeNull();
  });

  it("serves the made-up clubs, never The SOURCE", async () => {
    const res = await make().clubs.list();
    expect(res).toMatchObject({ ok: true, source: "demo" });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.every((c) => c.fictional)).toBe(true);
  });

  it("keeps flashcards per course: starter cards, add, edit, review and delete", async () => {
    const bridge = make();
    const cards = async () => (await bridge.db.courses.getFull("calc2")).flashcards;
    expect((await cards()).length).toBeGreaterThan(0);

    expect(await bridge.db.flashcards.save({ courseUuid: "calc2", uuid: "fc_new", front: "  d/dx sin x ", back: "cos x" })).toEqual({ success: true });
    expect(await bridge.db.flashcards.save({ courseUuid: "calc2", uuid: "fc_bad", front: "x", back: " " })).toMatchObject({ success: false });
    await bridge.db.flashcards.save({ courseUuid: "calc2", uuid: "fc_new", front: "d/dx sin x", back: "cos(x)" });
    await bridge.db.mastery.update({ flashcardUuid: "fc_new", grade: 4, easeFactor: 2.5, intervalDays: 1, repetitions: 1, nextReview: "2026-11-03" });

    const saved = (await cards()).find((c) => c.uuid === "fc_new");
    expect(saved).toMatchObject({ front: "d/dx sin x", back: "cos(x)", interval_days: 1, next_review: "2026-11-03", last_review: "2026-11-02", last_grade: 4 });
    expect(JSON.parse(storage.getItem(DEMO_KEY)).cards.calc2.some((c) => c.uuid === "fc_new")).toBe(true);

    await bridge.db.flashcards.delete("fc_new");
    expect((await cards()).some((c) => c.uuid === "fc_new")).toBe(false);
  });

  it("serves made-up events dated from today, never a live feed", async () => {
    const { ok, source, events } = await make().events.list();
    expect({ ok, source }).toEqual({ ok: true, source: "demo" });
    expect(events.every((e) => e.title.includes("(demo)") && Date.parse(e.start) > NOW.getTime() && Date.parse(e.end) > Date.parse(e.start))).toBe(true);
  });

  it("returns the chosen student's demo courses (four classes and one organization)", async () => {
    const bridge = make();
    expect(await bridge.db.courses.getAll()).toEqual([]);
    await pick(bridge, "maya");
    const rows = await bridge.db.courses.getAll();
    expect(rows).toHaveLength(5);
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
