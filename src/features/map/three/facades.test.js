import { describe, expect, it } from "vitest";
import { belts, cornice, facadeShapes, facingOf, frontEdge, outsetRing, portico, PORTICOS, TRIM, wallOf, wallShade } from "./facades.js";
import { mergeBuildings } from "./campusMesh.js";
import { inRing } from "./extrude.js";
import campus from "../campus.json";

const rect = (x, z, w, d) => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
const path = (ring) => `M${ring.map((p) => p.join(" ")).join("L")}Z`;
const ys = (shapes) => shapes.flatMap((s) => s.positions.filter((_, i) => i % 3 === 1));
const xz = (shapes) => shapes.flatMap((s) => s.positions.reduce((pts, v, i) => (i % 3 === 2 ? [...pts, [s.positions[i - 2], v]] : pts), []));
const quads = campus.areas.filter((a) => /quad$/i.test(a.name || "")).map((a) => a.c);

/** Every triangle's normal points away from the shape's middle (faces show from outside). */
function facesOut(s) {
  const n = s.positions.length / 3;
  const mid = [0, 1, 2].map((k) => s.positions.filter((_, i) => i % 3 === k).reduce((a, b) => a + b, 0) / n);
  const p = (i) => s.positions.slice(i * 3, i * 3 + 3);
  for (let t = 0; t < s.indices.length; t += 3) {
    const [a, b, c] = [p(s.indices[t]), p(s.indices[t + 1]), p(s.indices[t + 2])];
    const u = b.map((v, k) => v - a[k]);
    const w = c.map((v, k) => v - a[k]);
    const nrm = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const centre = [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3 - mid[k]);
    if (nrm.reduce((sum, v, k) => sum + v * centre[k], 0) < -1e-9) return false;
  }
  return true;
}

describe("frontEdge", () => {
  it("faces the way it is asked to, and keeps south as the default", () => {
    const ring = rect(0, 0, 30, 20);
    expect(frontEdge(ring).a[1]).toBe(20);
    const east = frontEdge(ring, 10, [1, 0]);
    expect([east.a[0], east.b[0]]).toEqual([30, 30]);
    expect(east.out[0]).toBeCloseTo(1);
  });
  it("takes the wall that faces best when none faces squarely", () => {
    const f = frontEdge(rect(0, 0, 30, 20), 10, [Math.SQRT1_2, Math.SQRT1_2]);
    expect(f).not.toBe(null);
    expect(f.out[0] + f.out[1]).toBeCloseTo(1);
  });
});

describe("outsetRing", () => {
  it("moves every wall out by d, either way round", () => {
    for (const ring of [rect(0, 0, 10, 10), [...rect(0, 0, 10, 10)].reverse()]) {
      const out = outsetRing(ring, 1).map((p) => p.map((v) => Math.round(v * 1000) / 1000));
      expect(out.map(String).sort()).toEqual(rect(-1, -1, 12, 12).map(String).sort());
    }
  });
  it("keeps sharp corners from spiking", () => {
    const sliver = [[0, 0], [40, 0], [0, 2]];
    for (const [i, p] of outsetRing(sliver, 0.5, 2).entries()) expect(Math.hypot(p[0] - sliver[i][0], p[1] - sliver[i][1])).toBeLessThanOrEqual(1.0001);
  });
});

describe("cornice", () => {
  it("is a light band under the eave, a little proud of the wall, with a top seen from above", () => {
    const shapes = cornice([rect(0, 0, 20, 12)], 10);
    expect(shapes.every((s) => s.trim && s.wallVerts === 0)).toBe(true);
    expect(Math.max(...ys(shapes))).toBeLessThan(10);
    expect(Math.min(...ys(shapes))).toBeCloseTo(10 - TRIM.cornice.tall);
    expect(Math.min(...xz(shapes).map((p) => p[0]))).toBeCloseTo(-TRIM.cornice.out);
    expect(shapes[0].indices.length).toBeGreaterThan(4 * 6); // walls and a top
  });
});

describe("belts", () => {
  it("gives a stone base and a line at each floor below the roof edge, clear of the windows", () => {
    const shapes = belts([rect(0, 0, 20, 12)], 14, { top: 13.4 });
    expect(shapes.every((s) => s.trim)).toBe(true);
    const mids = shapes.slice(1).map((s) => (Math.max(...ys([s])) + Math.min(...ys([s]))) / 2);
    expect(mids.map((y) => Math.round(y * 10) / 10)).toEqual([3.5, 7, 10.5]);
    expect(Math.min(...ys([shapes[0]]))).toBe(0);
    expect(Math.max(...ys([shapes[0]]))).toBeCloseTo(TRIM.base.tall);
    // the brick tile puts windows 1.2 to 2.9 m above each floor
    for (const y of mids) expect((y % 3.5 + 3.5) % 3.5 < 1.2 - TRIM.belt.tall || (y % 3.5) > 2.9).toBe(true);
  });
  it("gives a one floor shed a base and no lines", () => {
    expect(belts([rect(0, 0, 10, 10)], 4)).toHaveLength(1);
  });
});

describe("wallOf and wallShade", () => {
  it("uses OSM first, then stone by material, then our list, else brick", () => {
    expect(wallOf("President's Mansion", { colour: "#5e2612" })).toBe("#5e2612");
    expect(wallOf("Any Hall", { material: "limestone" })).toBe("stone");
    expect(wallOf("President's Mansion")).toBe("white");
    expect(wallOf("Bidgood Hall", { material: "brick" })).toBe(null);
  });
  it("is fixed per building, small, and not the same for all", () => {
    const shades = campus.buildings.map((b) => wallShade(b.id));
    expect(wallShade("w1")).toBe(wallShade("w1"));
    expect(Math.min(...shades)).toBeGreaterThanOrEqual(0.9);
    expect(Math.max(...shades)).toBeLessThanOrEqual(1.08);
    expect(new Set(shades.map((v) => v.toFixed(2))).size).toBeGreaterThan(10);
  });
});

describe("portico", () => {
  const front = frontEdge(rect(0, 0, 30, 20));
  it("stands columns off the wall, under a beam, and a gable on top", () => {
    const shapes = portico(front, 12, { t0: 7, t1: 23 });
    expect(shapes.every((s) => s.trim)).toBe(true);
    const columns = shapes.filter((s) => Math.max(...ys([s])) === 12 - TRIM.column.beam && Math.min(...ys([s])) === 0);
    expect(columns.length).toBeGreaterThanOrEqual(4);
    for (const c of columns) expect(Math.min(...xz([c]).map((p) => p[1]))).toBeGreaterThan(20); // in front of the wall
    const gable = shapes[shapes.length - 1];
    expect(Math.max(...ys([gable]))).toBeGreaterThan(12);
    expect(facesOut(gable)).toBe(true);
  });
  it("has no gable when asked for a plain colonnade", () => {
    expect(Math.max(...ys(portico(front, 12, { pediment: false })))).toBeLessThan(12);
  });
});

describe("facingOf", () => {
  it("reads a compass letter or faces the nearest quad", () => {
    expect(facingOf({ facing: "n" }, rect(0, 0, 10, 10))).toEqual([0, -1]);
    const d = facingOf({ facing: "quad" }, rect(0, 0, 10, 10), [[105, 5], [-500, 0]]);
    expect(d[0]).toBeCloseTo(1);
    expect(facingOf({ facing: "quad" }, rect(0, 0, 10, 10), [])).toBe(null);
    expect(facingOf(undefined, rect(0, 0, 10, 10))).toBe(null);
  });
});

describe("facadeShapes", () => {
  it("puts a cornice under sloped roofs only, and no trim on decks or the town", () => {
    const hall = { id: "h", path: path(rect(0, 0, 20, 12)), h: 11 };
    const top = (shapes) => Math.max(...ys(shapes));
    expect(top(facadeShapes(hall))).toBeCloseTo(11 - 0.01);
    expect(top(facadeShapes({ ...hall, roofShape: "flat" }))).toBeLessThan(11 - 1);
    expect(facadeShapes({ ...hall, plain: true })).toEqual([]);
    expect(facadeShapes({ id: "x", path: "", h: 11 })).toEqual([]);
  });
  it("gives every portico hall that is in the data a columned front facing its way", () => {
    for (const name of Object.keys(PORTICOS)) {
      const b = campus.buildings.find((x) => x.name === name);
      expect(b, name).toBeTruthy();
      const plain = facadeShapes({ ...b, name: "" }, quads);
      const shapes = facadeShapes(b, quads);
      expect(shapes.length, name).toBeGreaterThan(plain.length + 4);
      // the columns stand outside the footprint
      const ring = b.path.slice(1, -1).split("L").map((p) => p.split(" ").map(Number));
      const extra = xz(shapes.slice(plain.length, plain.length + 1));
      expect(extra.some((p) => !inRing(p, ring)), name).toBe(true);
    }
  });
  it("adds trim to many campus halls when merged, and stays one tappable building each", () => {
    const m = mergeBuildings(campus.buildings, { quads });
    expect(m.isTrim.filter(Boolean).length).toBeGreaterThan(1000);
    expect(m.triOwner).toHaveLength(m.indices.length / 3);
    expect(new Set(m.triOwner).size).toBe(m.owners.length);
  });
});
