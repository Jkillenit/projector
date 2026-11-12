import { describe, expect, it } from "vitest";
import { floorY, pointAt, to3d, walkLine, SPREAD } from "./walkPath.js";
import { buildGraph, route } from "../indoor/route.js";
import { steps } from "../indoor/steps.js";
import demoHall from "../../../demo/indoor/demo-hall.indoor.json";

const graph = buildGraph(demoHall);
const lineTo = (room, opts) => {
  const r = route(graph, undefined, room, opts);
  return { r, s: steps(r, demoHall), line: walkLine(r, steps(r, demoHall), demoHall) };
};

describe("floorY", () => {
  it("puts the lowest floor at 0 and pulls the others apart", () => {
    expect(floorY(1, demoHall)).toBe(0);
    expect(floorY(2, demoHall)).toBe(demoHall.floorHeight * SPREAD);
  });
});

describe("to3d", () => {
  it("places plan points on campus, with the map's y as 3D z", () => {
    const [ox, oy] = demoHall.origin;
    expect(to3d([3, 4], 2, demoHall, 0.5)).toEqual([ox + 3, floorY(2, demoHall) + 0.5, oy + 4]);
  });
});

describe("walkLine", () => {
  it("measures the route and where each step ends", () => {
    const { r, s, line } = lineTo("104");
    expect(line.points).toHaveLength(r.points.length);
    expect(line.total).toBeCloseTo(r.meters); // same floor: the 3D line is as long as the walk
    expect(line.stepEnds).toHaveLength(s.length);
    expect(line.stepEnds[0]).toBe(0); // "Go in the North door."
    expect(line.stepEnds.at(-1)).toBeCloseTo(line.total);
    for (let i = 1; i < line.stepEnds.length; i++) expect(line.stepEnds[i]).toBeGreaterThanOrEqual(line.stepEnds[i - 1]);
  });

  it("climbs between floors on a route that changes floors", () => {
    const { line } = lineTo("216");
    expect(line.total).toBeGreaterThan(lineTo("216").r.meters);
    expect(Math.max(...line.points.map((p) => p[1]))).toBeCloseTo(floorY(2, demoHall) + 0.6);
  });
});

describe("pointAt", () => {
  const line = { points: [[0, 0, 0], [10, 0, 0], [10, 6, 0]], at: [0, 10, 16], total: 16 };
  it("walks along the line", () => {
    expect(pointAt(line, 5)).toEqual([5, 0, 0]);
    expect(pointAt(line, 13)).toEqual([10, 3, 0]);
  });
  it("stays on the line at the ends", () => {
    expect(pointAt(line, -2)).toEqual([0, 0, 0]);
    expect(pointAt(line, 99)).toEqual([10, 6, 0]);
  });
});
