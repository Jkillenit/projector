import { describe, expect, it } from "vitest";
import { checkIndoor } from "../indoor/indoorData.js";
import { buildGraph, route } from "../indoor/route.js";
import { parsePathD, svgToIndoor } from "./planImport.js";

describe("parsePathD (#62)", () => {
  it("reads absolute M L H V Z", () => {
    expect(parsePathD("M0 0 L10 0 H20 V5 Z")).toEqual([{ points: [[0, 0], [10, 0], [20, 0], [20, 5]], closed: true }]);
  });

  it("reads relative m l h v z, with implicit line-tos and commas", () => {
    expect(parsePathD("m 10,10 5,0 l0,5 h-5 v-5 z")).toEqual([{ points: [[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]], closed: true }]);
  });

  it("splits sub paths, and a relative move after z starts from the sub path start", () => {
    expect(parsePathD("M0 0 L10 0 Z m 0 5 l 10 0")).toEqual([
      { points: [[0, 0], [10, 0]], closed: true },
      { points: [[0, 5], [10, 5]], closed: false },
    ]);
  });

  it("reads numbers like 1e2, -.5 and 3-4", () => {
    expect(parsePathD("M1e1-.5L3-4")).toEqual([{ points: [[10, -0.5], [3, -4]], closed: false }]);
  });

  it("says curves are not allowed", () => {
    expect(() => parsePathD("M0 0 C1 1 2 2 3 3")).toThrow("Use straight lines only");
  });
});

// What the dev screen reads from a tiny made up SVG: one unit is half a meter (scale-10 is 20 units long).
// Floor 1: a hall from the north door down to an east-west hall, room 101 and stairs. Floor 2: room 201 and stairs.
const layers = [
  {
    name: "floor-1",
    items: [
      { label: "scale-10", lines: [{ points: [[0, 0], [20, 0]], closed: false }] },
      { label: "outline", lines: [{ points: [[0, 0], [80, 0], [80, 40], [0, 40]], closed: true }] },
      { label: "walk", lines: [{ points: [[40, 0], [40, 20]], closed: false }, { points: [[0, 20], [80, 20]], closed: false }] },
      { label: "room-101", lines: [{ points: [[50, 24], [70, 24], [70, 40], [50, 40]], closed: true }] },
      { label: "door-101", at: [60, 24] },
      { label: "entrance-north main stepfree", at: [40.4, 0] },
      { label: "stairs-a", at: [10, 20] },
      { label: "elevator-1", at: [74, 20.6] },
      { label: "landmark", at: [30, 22], text: "Vending machines" },
      { label: "a stray note" },
    ],
  },
  {
    name: "floor-2",
    items: [
      { label: "outline", lines: [{ points: [[0, 0], [80, 0], [80, 40], [0, 40]], closed: true }] },
      { label: "walk", lines: [{ points: [[0, 20], [80, 20]], closed: false }] },
      { label: "room-201", lines: [{ points: [[50, 24], [70, 24], [70, 40], [50, 40]], closed: true }] },
      { label: "door-201", at: [60, 24] },
      { label: "stairs-a", at: [10, 20] },
      { label: "elevator-1", at: [74, 20] },
    ],
  },
  { name: "notes", items: [{ label: "outline", lines: [] }] },
];
const building = { building: "made-up-hall", name: "Made Up Hall", origin: [100, 200], rotation: 15, floorHeight: 4 };

describe("svgToIndoor (#62)", () => {
  const { data, notes } = svgToIndoor(layers, building);

  it("builds a building that passes the checker and routes", () => {
    expect(checkIndoor(data)).toEqual({ ok: true, problems: [] });
    expect(route(buildGraph(data), "north", "201").points.length).toBeGreaterThan(2);
  });

  it("turns SVG units into meters with the scale line", () => {
    const f1 = data.floors[0];
    expect(f1).toMatchObject({ level: 1, name: "Floor 1", outline: [[0, 0], [40, 0], [40, 20], [0, 20]] });
    expect(f1.walk).toEqual([[[20, 0], [20, 10]], [[0, 10], [40, 10]]]);
    expect(f1.rooms).toEqual([{ id: "101", name: "Room 101", outline: [[25, 12], [35, 12], [35, 20], [25, 20]], door: [30, 12] }]);
    expect(f1.landmarks).toEqual([{ name: "Vending machines", at: [15, 11] }]);
  });

  it("snaps doors, stairs and elevators onto the nearest walk line, and reads the flags", () => {
    const f1 = data.floors[0];
    expect(f1.entrances).toEqual([{ id: "north", name: "North door", at: [20, 0], stepFree: true, main: true }]);
    expect(f1.links).toEqual([
      { id: "stairs-a", name: "Stairs A", kind: "stairs", at: [5, 10] },
      { id: "elevator-1", name: "Elevator 1", kind: "elevator", at: [37, 10] },
    ]);
  });

  it("keeps the building fields and skips layers that are not floors", () => {
    expect(data).toMatchObject(building);
    expect(data.floors.map((f) => f.level)).toEqual([1, 2]);
    expect(notes).toEqual(["Skipped a stray note on floor-1: not a name we know", "Skipped layer notes: not named like floor-1"]);
  });

  it("needs a scale line", () => {
    expect(svgToIndoor([{ name: "floor-1", items: [] }], building).notes).toContain("No scale line: add a line labeled like scale-10 (its real length in meters)");
  });
});
