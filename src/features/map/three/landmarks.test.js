import { describe, expect, it } from "vitest";
import { CHIMES, frontEdge, GORGAS, gorgasParts, landmarkShapes } from "./landmarks.js";
import { pathToRings } from "./extrude.js";
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
  describe("Gorgas Library (#200)", () => {
    const b = byName("Amelia Gayle Gorgas Library");
    const parts = gorgasParts(pathToRings(b.path), b.h, b.id);
    const zs = (shapes) => shapes.flatMap((s) => s.positions.filter((_, i) => i % 3 === 2));
    const top = (shapes) => Math.max(...ys(shapes));
    const front = frontEdge(pathToRings(b.path)[0]);
    const along = (x, z) => (x - front.a[0]) * (front.b[0] - front.a[0]) / front.len + (z - front.a[1]) * (front.b[1] - front.a[1]) / front.len;
    const xzs = (shapes) => shapes.flatMap((s) => s.positions.filter((_, i) => i % 3 !== 1)).reduce((out, v, i, a) => (i % 2 ? out : [...out, [v, a[i + 1]]]), []);

    it("splits into a stone center, columns, steps, brick wings and the stacks behind", () => {
      expect(parts).not.toBe(null);
      expect(landmarkShapes(b)).toHaveLength(Object.values(parts).flat().length);
      for (const k of ["columns", "steps"]) expect(parts[k].every((s) => s.trim), k).toBe(true);
      expect(parts.center.filter((s) => !s.trim)).toHaveLength(1); // the wall behind the columns, in shade
      expect(parts.center.filter((s) => !s.trim)[0].wallVerts).toBe(0);
      expect(parts.stacks.filter((s) => s.wallVerts > 0).every((s) => !s.trim)).toBe(true); // brick walls, a light rim on top
      expect(top(parts.stacks.filter((s) => s.wallVerts > 0))).toBeCloseTo(b.h); // the stacks are the top, less the units on the roof
      expect(Math.min(...ys(landmarkShapes(b)))).toBeGreaterThanOrEqual(0);
    });
    it("raises the stone center over the wings, gables and all, and under the stacks", () => {
      expect(top(parts.center)).toBeCloseTo(b.h * GORGAS.center);
      expect(top(parts.wings)).toBeLessThan(top(parts.center) - 1);
      expect(top(parts.center)).toBeLessThan(top(parts.stacks));
    });
    it("stands eight columns in front of the center block only, on the podium, up to the wings' eave", () => {
      expect(parts.columns).toHaveLength(8);
      for (const c of parts.columns) {
        expect(Math.min(...ys([c]))).toBeCloseTo(GORGAS.podium);
        expect(top([c])).toBeCloseTo(b.h * GORGAS.eave);
      }
      const span = (shapes) => {
        const t = xzs(shapes).map(([x, z]) => along(x, z));
        return [Math.min(...t), Math.max(...t)];
      };
      const [c0, c1] = span(parts.center);
      const [k0, k1] = span(parts.columns);
      expect(k0).toBeGreaterThan(c0);
      expect(k1).toBeLessThan(c1);
      expect(c1 - c0).toBeLessThan(front.len * 2); // the center block, not the whole Quad side
    });
    it("puts wide steps out on the Quad, lowest furthest out", () => {
      const stairs = parts.steps.filter((s) => s.wallVerts === 0 && top([s]) <= GORGAS.podium + 1e-6);
      expect(Math.max(...zs(parts.steps))).toBeGreaterThan(Math.max(...zs(parts.center))); // out past the front wall
      expect(top(parts.steps)).toBeLessThanOrEqual(GORGAS.podium + 0.5 + 1e-6);
      expect(stairs.length).toBeGreaterThan(0);
    });
    it("gives each wing a gable and a round window facing the Quad, and a hip at the back", () => {
      const eave = b.h * GORGAS.eave;
      const brick = parts.wings.filter((s) => !s.trim);
      const gableVerts = brick.flatMap((s) => {
        const out = [];
        for (let v = 0; v < s.wallVerts; v++) if (s.positions[v * 3 + 1] > eave + 1) out.push(s.positions[v * 3 + 2]);
        return out;
      });
      expect(gableVerts).toHaveLength(2); // one apex per pavilion: only the two front gables rise over the eave as wall
      for (const z of gableVerts) expect(z).toBeGreaterThan(b.c[1]); // on the Quad side
      const windows = parts.wings.filter((s) => s.trim && s.indices.length === 14 * 3);
      expect(windows).toHaveLength(2);
      for (const w of windows) {
        expect(Math.min(...ys([w]))).toBeGreaterThan(eave);
        expect(Math.min(...zs([w]))).toBeGreaterThan(b.c[1]);
      }
    });
    it("falls back to the plain roofed hall when the footprint is not Gorgas's shape", () => {
      expect(gorgasParts(pathToRings(SQUARE), 18)).toBe(null);
      expect(landmarkShapes({ name: "Amelia Gayle Gorgas Library", path: SQUARE, h: 18 }).length).toBeGreaterThan(0);
    });
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
    expect(g.isFlat.length).toBe(g.positions.length / 3);
    expect(g.isFlat.some((f, v) => f && g.isRoof[v] && !g.isTrim[v])).toBe(true); // #200: the stacks' roof is a light membrane
    expect(m.isFlat.some(Boolean)).toBe(false); // nothing else changes
  });
});
