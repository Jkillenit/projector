import { describe, expect, it } from "vitest";
import { extrudeRings, pathToRings } from "./extrude.js";
import campus from "../campus.json";

const SQUARE = "M0 0L10 0L10 10L0 10Z";

// Sum of roof triangle areas, read back from the 3D arrays (x, z plane).
function roofArea({ positions, indices }, corners) {
  let sum = 0;
  for (let t = corners * 6; t < indices.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => indices[t + k] * 3);
    const ux = positions[b] - positions[a], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vz = positions[c + 2] - positions[a + 2];
    sum += Math.abs(ux * vz - uz * vx) / 2;
  }
  return sum;
}
const ringArea = (r) => Math.abs(r.reduce((s, [x, y], i) => s + x * r[(i + 1) % r.length][1] - y * r[(i + 1) % r.length][0], 0)) / 2;

describe("pathToRings", () => {
  it("reads M L Z paths and drops the closing point", () => {
    expect(pathToRings(SQUARE)).toEqual([[[0, 0], [10, 0], [10, 10], [0, 10]]]);
    expect(pathToRings("M0 0L1 0L1 1L0 0Z")).toEqual([[[0, 0], [1, 0], [1, 1]]]);
  });
  it("splits relations into rings and keeps negative numbers", () => {
    expect(pathToRings(`${SQUARE}M-5 -5L-1 -5L-1 -1Z`)).toHaveLength(2);
  });
  it("gives nothing for bad or empty paths", () => {
    for (const bad of [undefined, "", "M", "M1 2L3", "M1 2C3 4 5 6 7 8Z", "M1 2L3 4Z", "hello", "M0 0l10 0l0 10z"]) {
      expect(pathToRings(bad)).toEqual([]);
    }
  });
});

describe("extrudeRings", () => {
  it("a square gives 4 walls and a 2 triangle roof", () => {
    const [shape] = extrudeRings(pathToRings(SQUARE), 12);
    expect(shape.positions).toHaveLength((16 + 4) * 3);
    expect(shape.indices).toHaveLength(4 * 6 + 2 * 3);
    // map y is 3D z, up is 3D y
    const roof = shape.positions.slice(-12);
    expect([roof.slice(0, 3), roof.slice(3, 6), roof.slice(6, 9), roof.slice(9)]).toContainEqual([10, 12, 10]);
    const ys = shape.positions.filter((_, i) => i % 3 === 1);
    expect(new Set(ys)).toEqual(new Set([0, 12]));
  });
  it("every wall faces away from the middle, whichever way the outline winds", () => {
    for (const d of [SQUARE, "M0 0L0 10L10 10L10 0Z"]) {
      const { positions: p, indices: ix } = extrudeRings(pathToRings(d), 5)[0];
      for (let t = 0; t < 4 * 6; t += 3) {
        const [a, b, c] = ix.slice(t, t + 3).map((i) => i * 3);
        // x and z parts of (b - a) x (c - a)
        const nx = (p[b + 1] - p[a + 1]) * (p[c + 2] - p[a + 2]) - (p[b + 2] - p[a + 2]) * (p[c + 1] - p[a + 1]);
        const nz = (p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[a]);
        const mx = (p[a] + p[b] + p[c]) / 3 - 5, mz = (p[a + 2] + p[b + 2] + p[c + 2]) / 3 - 5;
        expect(nx * mx + nz * mz).toBeGreaterThan(0);
      }
    }
  });
  it("roof faces up whichever way the outline winds", () => {
    for (const d of [SQUARE, "M0 0L0 10L10 10L10 0Z"]) {
      const { positions: p, indices: ix } = extrudeRings(pathToRings(d), 5)[0];
      const [a, b, c] = ix.slice(24, 27).map((i) => i * 3);
      const normalY = (p[b + 2] - p[a + 2]) * (p[c] - p[a]) - (p[b] - p[a]) * (p[c + 2] - p[a + 2]);
      expect(normalY).toBeGreaterThan(0);
    }
  });
  it("a 2 ring path gives 2 shapes", () => {
    expect(extrudeRings(pathToRings(`${SQUARE}M20 0L30 0L30 10Z`), 3)).toHaveLength(2);
  });
  it("skips bad input instead of crashing", () => {
    expect(extrudeRings(pathToRings("nope"), 10)).toEqual([]);
    expect(extrudeRings([[[0, 0], [1, 1], [2, 2]]], 10)).toEqual([]); // flat line
    expect(extrudeRings(pathToRings(SQUARE), 0)).toEqual([]);
    expect(extrudeRings(null, 10)).toEqual([]);
  });
  it("fills every real campus roof (concave ones too)", () => {
    for (const b of campus.buildings) {
      const rings = pathToRings(b.path);
      expect(rings.length, b.name).toBeGreaterThan(0);
      const shapes = extrudeRings(rings, b.h);
      expect(shapes, b.name).toHaveLength(rings.length);
      shapes.forEach((shape, i) => {
        expect(roofArea(shape, rings[i].length), b.name).toBeCloseTo(ringArea(rings[i]), 3);
      });
    }
  });
});
