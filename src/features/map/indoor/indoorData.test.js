import { describe, expect, it } from "vitest";
import { checkIndoor, footprint, toCampus } from "./indoorData.js";
import demoHall from "../../../demo/indoor/demo-hall.indoor.json";

// A small valid building: two floors joined by stairs and an elevator.
function hall() {
  const floor = (level) => ({
    level,
    name: `Floor ${level}`,
    outline: [[0, 0], [60, 0], [60, 30], [0, 30]],
    rooms: [{ id: `${level}16`, name: `Room ${level}16`, outline: [[2, 2], [12, 2], [12, 10], [2, 10]], door: [7, 10] }],
    walk: [[[0, 15], [60, 15]], [[30, 0], [30, 15]]],
    entrances: level === 1 ? [{ id: "north", name: "North door", at: [30, 0], stepFree: true, main: true }] : [],
    links: [
      { id: "stairs-a", name: "Stairs A", kind: "stairs", at: [5, 15] },
      { id: "elevator-1", name: "Elevator", kind: "elevator", at: [55, 15] },
    ],
    landmarks: [{ name: "Vending machines", at: [20, 16] }],
  });
  return { building: "demo-hall", name: "Demo Hall", origin: [410, -220], rotation: 0, floorHeight: 4, floors: [floor(1), floor(2)] };
}

const problemsOf = (change) => {
  const data = hall();
  change(data);
  const result = checkIndoor(data);
  expect(result.ok).toBe(result.problems.length === 0);
  return result.problems;
};

describe("checkIndoor", () => {
  it("passes a good building", () => {
    expect(checkIndoor(hall())).toEqual({ ok: true, problems: [] });
  });

  it("rejects things that are not a building", () => {
    for (const bad of [null, undefined, "x", [], {}]) expect(checkIndoor(bad).ok).toBe(false);
  });

  it("needs the building fields", () => {
    expect(problemsOf((d) => { delete d.building; })).toContain("The building has no id");
    expect(problemsOf((d) => { d.name = ""; })).toContain("The building has no name");
    expect(problemsOf((d) => { d.origin = [1]; })).toContain("The building's origin is not a point");
    expect(problemsOf((d) => { d.rotation = "12"; })).toContain("The building's rotation is not a number");
    expect(problemsOf((d) => { d.floorHeight = 0; })).toContain("The floor height is not more than 0");
    expect(problemsOf((d) => { d.floors = []; })).toContain("The building has no floors");
  });

  it("rotation is optional", () => {
    expect(problemsOf((d) => { delete d.rotation; })).toEqual([]);
  });

  it("checks floors", () => {
    expect(problemsOf((d) => { d.floors[1].level = 1; })).toContain("Two floors are level 1");
    expect(problemsOf((d) => { d.floors[0].outline = [[0, 0], [1, 1]]; })).toContain("Floor 1 has no outline");
  });

  it("finds a room with no door, no outline or a reused number", () => {
    expect(problemsOf((d) => { delete d.floors[0].rooms[0].door; })).toEqual(["Room 116 has no door"]);
    expect(problemsOf((d) => { d.floors[0].rooms[0].outline = []; })).toEqual(["Room 116 has no outline"]);
    expect(problemsOf((d) => { d.floors[1].rooms[0].id = "116"; })).toEqual(["Room 116 is used twice"]);
    expect(problemsOf((d) => { delete d.floors[0].rooms[0].id; })).toEqual(["A room on Floor 1 has no number"]);
  });

  it("finds a walk line with under 2 points", () => {
    expect(problemsOf((d) => { d.floors[0].walk.push([[1, 1]]); })).toEqual(["A walk line on Floor 1 has under 2 points"]);
  });

  it("needs an entrance, on a walk line", () => {
    expect(problemsOf((d) => { d.floors[0].entrances = []; })).toEqual(["The building has no entrance"]);
    expect(problemsOf((d) => { d.floors[0].entrances[0].at = [40, 0]; })).toEqual(["Entrance North door is not on a walk line"]);
    expect(problemsOf((d) => { d.floors[0].entrances[0].at = [30, 0.4]; })).toEqual([]); // close enough
  });

  it("finds stairs on one floor, off the walk, or of an unknown kind", () => {
    expect(problemsOf((d) => { d.floors[1].links.shift(); })).toEqual(["Stairs A is only on one floor"]);
    expect(problemsOf((d) => { d.floors[1].links[0].at = [5, 20]; })).toEqual(["Stairs A is not on a walk line on Floor 2"]);
    expect(problemsOf((d) => { d.floors[0].links[0].kind = "ramp"; })).toEqual(["Stairs A is not stairs or an elevator"]);
  });

  it("finds landmarks with no name or place", () => {
    expect(problemsOf((d) => { d.floors[0].landmarks[0].at = null; })).toEqual(["Landmark Vending machines has no place"]);
    expect(problemsOf((d) => { d.floors[0].landmarks[0].name = ""; })).toEqual(["A landmark on Floor 1 has no name"]);
  });

  it("does not crash on missing lists", () => {
    const d = hall();
    for (const f of d.floors) for (const k of ["rooms", "walk", "entrances", "links", "landmarks"]) delete f[k];
    expect(checkIndoor(d).problems).toEqual(["The building has no entrance"]);
  });
});

describe("toCampus", () => {
  it("adds the origin", () => {
    expect(toCampus([3, 4], { origin: [410, -220] })).toEqual([413, -216]);
  });
  it("turns clockwise on the map (y points south)", () => {
    const [x, y] = toCampus([10, 0], { origin: [0, 0], rotation: 90 });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10); // east turns to south
  });
  it("rotates around the plan's [0, 0], then moves", () => {
    const [x, y] = toCampus([0, 10], { origin: [100, 100], rotation: 90 });
    expect(x).toBeCloseTo(90);
    expect(y).toBeCloseTo(100);
  });
});

describe("footprint", () => {
  it("places the ground floor outline on the campus map", () => {
    expect(footprint(hall())).toEqual({
      id: "demo-hall", name: "Demo Hall", alt: [], c: [440, -205], h: 8,
      path: "M410 -220L470 -220L470 -190L410 -190Z",
    });
  });
});

describe("Demo Hall", () => {
  it("passes the checker", () => {
    expect(checkIndoor(demoHall)).toEqual({ ok: true, problems: [] });
  });
  it("has what the demo needs", () => {
    const rooms = demoHall.floors.flatMap((f) => f.rooms);
    const entrances = demoHall.floors.flatMap((f) => f.entrances);
    expect(demoHall.floors).toHaveLength(2);
    expect(rooms.map((r) => r.id)).toContain("216");
    expect(entrances.filter((e) => e.stepFree)).toHaveLength(1);
    expect(new Set(demoHall.floors.flatMap((f) => f.links.map((l) => l.kind)))).toEqual(new Set(["stairs", "elevator"]));
  });
});
