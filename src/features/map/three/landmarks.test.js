import { describe, expect, it } from "vitest";
import { CHIMES, frontEdge, landmarkShapes } from "./landmarks.js";
import { mergeBuildings } from "./campusMesh.js";
import campus from "../campus.json";

const SQUARE = "M0 0L20 0L20 20L0 20Z";
const ys = (shapes) => shapes.flatMap((s) => s.positions.filter((_, i) => i % 3 === 1));
const byName = (name) => campus.buildings.find((b) => b.name === name);

describe("frontEdge", () => {
  it("finds the south (down the map) facing edge and points out of the building", () => {
    for (const ring of [[[0, 0], [20, 0], [20, 20], [0, 20]], [[0, 20], [20, 20], [20, 0], [0, 0]]]) {
      const f = frontEdge(ring);
      expect(f.out[0]).toBeCloseTo(0);
      expect(f.out[1]).toBeCloseTo(1);
      expect(f.a[1]).toBe(20);
      expect(f.b[1]).toBe(20);
    }
  });
  it("picks the porch that sticks out over a longer wing set back", () => {
    const ring = [[0, 0], [60, 0], [60, 20], [40, 20], [40, 26], [20, 26], [20, 20], [0, 20]];
    const f = frontEdge(ring);
    expect([f.a[1], f.b[1]]).toEqual([26, 26]);
  });
  it("skips edges shorter than min", () => {
    expect(frontEdge([[0, 0], [5, 0], [5, 5], [0, 5]], 10)).toBe(null);
  });
});

describe("landmarkShapes", () => {
  it("leaves other buildings as plain blocks", () => {
    expect(landmarkShapes({ name: "Bidgood Hall", path: SQUARE, h: 10 })).toBe(null);
    expect(landmarkShapes({ name: "Denny Chimes", path: "", h: 35 })).toBe(null);
  });
  it("gives Denny Chimes a white base, a brick shaft that narrows, an open belfry and a stepped white cap (#199)", () => {
    const b = byName("Denny Chimes");
    expect(b.h).toBeGreaterThanOrEqual(30); // 115 ft, from buildings-extra.json
    const shapes = landmarkShapes(b);
    expect(Math.max(...ys(shapes))).toBeCloseTo(b.h);
    const xs = (list) => list.flatMap((s) => s.positions.filter((_, i) => i % 3 === 0));
    const width = (list) => Math.max(...xs(list)) - Math.min(...xs(list));
    const between = (y0, y1) => shapes.filter((s) => Math.min(...ys([s])) >= y0 - 1e-6 && Math.max(...ys([s])) <= y1 + 1e-6);
    const brick = shapes.filter((s) => !s.trim && s.wallVerts > 0);
    expect(brick).toHaveLength(1); // the shaft is the only brick
    const shaft = brick[0];
    const ringAt = (y) => ({ positions: shaft.positions.filter((_, i, a) => Math.abs(a[i - (i % 3) + 1] - y) < 1e-6) });
    expect(width([ringAt(b.h * CHIMES.shaft.top)])).toBeLessThan(width([ringAt(b.h * CHIMES.base.lip)])); // narrows
    const base = between(0, b.h * CHIMES.base.top);
    expect(base.length).toBeGreaterThan(0);
    expect(base.every((s) => s.trim)).toBe(true);
    expect(width(base)).toBeGreaterThan(width([shaft])); // the base is wider than the shaft
    const belfry = between(b.h * CHIMES.band.top, b.h * CHIMES.belfry.top);
    expect(belfry.filter((s) => s.trim).length).toBe(4 * 3); // 4 corner posts, 2 thin ones per side
    expect(belfry.filter((s) => !s.trim && s.wallVerts === 0)).toHaveLength(1); // the dark openings
    const cap = between(b.h * CHIMES.cornice.top, b.h).map((s) => width([s]));
    expect(cap).toHaveLength(CHIMES.cap.length);
    expect(cap.every((w, i) => i === 0 || w < cap[i - 1])).toBe(true); // each tier smaller
  });
  it("gives Gorgas columns on its Quad side, marked as trim, under the roof line", () => {
    const b = byName("Amelia Gayle Gorgas Library");
    const shapes = landmarkShapes(b);
    const trim = shapes.filter((s) => s.trim);
    expect(trim.length).toBeGreaterThanOrEqual(5); // columns and the beam over them
    for (const s of trim) {
      expect(Math.max(...ys([s]))).toBeLessThanOrEqual(b.h);
      // Quad side: south of the building's middle
      expect(Math.min(...s.positions.filter((_, i) => i % 3 === 2))).toBeGreaterThan(b.c[1]);
    }
  });
  it("stays one tappable building when merged", () => {
    const b = byName("Denny Chimes");
    const m = mergeBuildings([b, { id: "plain", path: SQUARE, h: 10 }]);
    expect(m.owners.map((o) => o.id)).toEqual([b.id, "plain"]);
    expect(m.triOwner.length).toBe(m.indices.length / 3);
    expect(new Set(m.triOwner)).toEqual(new Set([b.id, "plain"]));
    const g = mergeBuildings([byName("Amelia Gayle Gorgas Library")]);
    expect(g.isTrim.some(Boolean)).toBe(true);
    expect(g.isTrim.length).toBe(g.positions.length / 3);
  });
});
