import { describe, expect, it } from "vitest";
import { fallLeaf, insideOf, inRing, lines, placeTrees, seasonOf, seeded } from "./trees.js";
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

describe("insideOf", () => {
  it("tells campus buildings from the town around it (#165)", () => {
    const onCampus = insideOf(nature.campus);
    const at = (name) => onCampus(campus.buildings.find((b) => b.name === name).c);
    expect(at("Amelia Gayle Gorgas Library")).toBe(true);
    expect(at("ALDI")).toBe(false);
    expect(campus.buildings.filter((b) => onCampus(b.c)).length).toBeGreaterThan(campus.buildings.length / 2);
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

  it("plants a grove densely with bigger trees, and still off the building and the path (#168)", () => {
    const [grove] = pathToRings(SQUARE(0, 0, 100));
    const inGrove = (list) => list.filter(([x, y]) => inRing([x, y], grove));
    const dense = placeTrees(small, [hall], undefined, [grove]);
    expect(inGrove(dense).length).toBeGreaterThan(inGrove(trees).length * 1.25);
    expect(inGrove(dense).filter(([, , size]) => size > 0).length).toBeGreaterThan(inGrove(dense).length * 0.7);
    const [b] = pathToRings(hall.path);
    for (const [x, y] of dense) expect(inRing([x, y], b)).toBe(false);
  });
});

describe("placeTrees on the real campus data", () => {
  const trees = placeTrees(nature, campus.buildings, campus.bounds);

  it("is tree lined but stays drawable", () => {
    expect(trees.length).toBeGreaterThan(3000);
    expect(trees.length).toBeLessThan(26000);
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

describe("fall color", () => {
  it("knows the season for a date", () => {
    expect(seasonOf(new Date(2026, 10, 12))).toBe("fall");
    expect(seasonOf(new Date(2026, 9, 15))).toBe("fall");
    expect(seasonOf(new Date(2026, 11, 5))).toBe("fall");
    expect(seasonOf(new Date(2026, 9, 14))).toBe("green");
    expect(seasonOf(new Date(2026, 11, 6))).toBe("green");
    expect(seasonOf(new Date(2026, 3, 1))).toBe("green");
  });
  it("turns about half the trees, in warm colors", () => {
    const picks = Array.from({ length: 1000 }, (_, i) => fallLeaf(i / 1000));
    const turned = picks.filter(Boolean);
    expect(turned.length).toBeGreaterThan(400);
    expect(turned.length).toBeLessThan(600);
    for (const [h, s, l] of turned) {
      expect(h).toBeLessThan(0.15); // red to gold, never green
      expect(s).toBeGreaterThan(0.5);
      expect(l).toBeGreaterThan(0.3);
    }
    expect(fallLeaf(0.9)).toBe(null);
  });
});
