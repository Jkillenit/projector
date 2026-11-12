import { describe, expect, it } from "vitest";
import { inRing, lines, placeTrees, seeded } from "./trees.js";
import { pathToRings } from "./extrude.js";
import { roadWidth } from "./campusMesh.js";
import nature from "../campus-nature.json";
import campus from "../campus.json";

const SQUARE = (x, y, s) => `M${x} ${y}L${x + s} ${y}L${x + s} ${y + s}L${x} ${y + s}Z`;
const segDist = ([px, py], [ax, ay], [bx, by]) => {
  const [dx, dy] = [bx - ax, by - ay];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};

describe("seeded", () => {
  it("gives the same numbers for the same seed", () => {
    const [a, b] = [seeded(7), seeded(7)];
    const xs = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(xs);
    xs.forEach((x) => expect(x >= 0 && x < 1).toBe(true));
  });
});

describe("inRing", () => {
  it("tells inside from outside", () => {
    const [ring] = pathToRings(SQUARE(0, 0, 10));
    expect(inRing([5, 5], ring)).toBe(true);
    expect(inRing([15, 5], ring)).toBe(false);
  });
});

describe("placeTrees on a made up lawn", () => {
  const lawn = SQUARE(0, 0, 200);
  const small = {
    campus: SQUARE(-100, -100, 400), grass: lawn, wood: "", water: "", parking: SQUARE(150, 150, 40), pitch: "", track: "",
    paths: "M0 100L200 100", treeRows: "M-50 -50L-50 50", roads: { residential: "M-30 -100L-30 300", service: "M250 0L250 200" }, trees: [[20, 20]], outlines: [],
  };
  const hall = { path: SQUARE(60, 30, 40) };
  const trees = placeTrees(small, [hall]);

  it("keeps OSM trees and plants tree rows", () => {
    expect(trees).toContainEqual([20, 20, expect.any(Number)]);
    expect(trees.filter(([x]) => x === -50).length).toBeGreaterThan(5);
  });

  it("lines campus roads on both sides, but not driveways", () => {
    const off = roadWidth("residential") / 2 + 4.5;
    expect(trees.filter(([x]) => Math.abs(x - (-30 - off)) < 0.2).length).toBeGreaterThan(5);
    expect(trees.filter(([x]) => Math.abs(x - (-30 + off)) < 0.2).length).toBeGreaterThan(5);
    expect(trees.filter(([x]) => Math.abs(Math.abs(x - 250) - (roadWidth("service") / 2 + 4.5)) < 0.2)).toEqual([]);
  });

  it("fills the lawn, but never the building, the parking lot or the path", () => {
    const [b] = pathToRings(hall.path);
    const [lot] = pathToRings(small.parking);
    const onLawn = trees.filter(([x, y]) => x > 0 && x < 200 && y > 0 && y < 200);
    expect(onLawn.length).toBeGreaterThan(15);
    for (const [x, y] of trees) {
      expect(inRing([x, y], b)).toBe(false);
      expect(inRing([x, y], lot)).toBe(false);
      expect(Math.abs(y - 100) > 2 || x < 0 || x > 200).toBe(true);
    }
  });

  it("is the same every time", () => {
    expect(placeTrees(small, [hall])).toEqual(trees);
  });
});

describe("placeTrees on the real campus data", () => {
  const trees = placeTrees(nature, campus.buildings, campus.bounds);

  it("is tree lined but stays drawable", () => {
    expect(trees.length).toBeGreaterThan(3000);
    expect(trees.length).toBeLessThan(15000);
  });

  it("never puts a tree inside a building or on a road", () => {
    const rings = [...campus.buildings.map((b) => b.path), ...nature.outlines.map((o) => o.path)].flatMap(pathToRings);
    const roads = Object.entries(nature.roads).flatMap(([type, d]) => lines(d).map((pts) => ({ pts, half: roadWidth(type) / 2 })));
    // Check a seeded sample: every tree against every shape is slow.
    const pick = seeded(1);
    for (let n = 0; n < 300; n++) {
      const p = trees[Math.floor(pick() * trees.length)];
      expect(rings.some((r) => inRing(p, r))).toBe(false);
      expect(roads.some(({ pts, half }) => pts.some((a, i) => i > 0 && segDist(p, pts[i - 1], a) < half))).toBe(false);
    }
  });
});
