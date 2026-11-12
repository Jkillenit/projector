import { describe, expect, it } from "vitest";
import { buildGraph, route } from "./route.js";
import { feet, steps } from "./steps.js";
import demoHall from "../../../demo/indoor/demo-hall.indoor.json";

const graph = buildGraph(demoHall);
const textOf = (r) => steps(r, demoHall).map((s) => s.text);

describe("steps on Demo Hall", () => {
  it("walks to a room on the same floor", () => {
    expect(textOf(route(graph, "north", "104"))).toEqual([
      "Go in the North door.",
      "Walk straight about 40 feet.",
      "Turn left.",
      "Room 104 is the first door on your right.",
    ]);
  });

  it("takes the stairs up, with landmarks on the way", () => {
    expect(textOf(route(graph, "north", "216"))).toEqual([
      "Go in the North door.",
      "Walk straight about 40 feet.",
      "Turn right.",
      "Walk about 70 feet, past the vending machines.",
      "Take Stairs A up to Floor 2.",
      "Walk about 70 feet, past the water fountain.",
      "Room 216 is the second door on your right.",
    ]);
  });

  it("takes the elevator when step free", () => {
    expect(textOf(route(graph, undefined, "216", { stepFree: true }))).toEqual([
      "Go in the North door.",
      "Walk straight about 40 feet.",
      "Turn left.",
      "Walk about 70 feet, past the trophy case.",
      "Take the elevator up to Floor 2.",
      "Walk about 60 feet, past the water fountain.",
      "Room 216 is the second door on your left.",
    ]);
  });

  it("does not count a small bend as a turn", () => {
    const d = structuredClone(demoHall);
    d.floors[0].walk = [[[0, 12], [20, 12], [48, 14]], [[24, 0], [24, 12.3]]];
    d.floors[0].entrances[1].at = [0, 12];
    const r = route(buildGraph(d), "west", "105");
    expect(steps(r, d).filter((s) => s.text.startsWith("Turn"))).toEqual([]);
  });

  it("goes down as well as up", () => {
    const d = structuredClone(demoHall);
    for (const f of d.floors) f.level = f.level === 1 ? 2 : 1;
    for (const f of d.floors) f.name = `Floor ${f.level}`;
    expect(textOf(route(buildGraph(d), "north", "216"))).toContain("Take Stairs A down to Floor 1.");
  });

  it("keeps the part of the route each step covers", () => {
    const r = route(graph, "north", "216");
    const all = steps(r, demoHall);
    expect(all[0].points).toEqual([r.points[0]]);
    expect(all.at(-1).points.at(-1)).toBe(r.points.at(-1));
    for (const s of all) expect(s.points.length).toBeGreaterThan(0);
    // Every point of the route is in some step, in order.
    const seen = all.flatMap((s) => s.points).filter((p, i, a) => p !== a[i - 1]);
    expect(seen).toEqual(r.points);
  });

  it("gives nothing for no route", () => {
    expect(steps({ points: [], reason: "No step free way to Room 216" }, demoHall)).toEqual([]);
  });
});

describe("feet", () => {
  it("rounds to the nearest 10, at least 10", () => {
    expect(feet(12)).toBe(40);
    expect(feet(20)).toBe(70);
    expect(feet(1)).toBe(10);
  });
});
