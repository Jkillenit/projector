import { describe, expect, it } from "vitest";
import { extrudeRings, inRing, insetRing, pathToRings } from "./extrude.js";
import { asRectangle, ridgeRoof, ROOF, roofedShapes, roofOf, roofTiers, wings } from "./roofs.js";
import { mergeBuildings } from "./campusMesh.js";
import { insideOf } from "./trees.js";
import nature from "../campus-nature.json";
import campus from "../campus.json";

const rect = (x, z, w, d) => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
const path = (ring) => `M${ring.map((p) => p.join(" ")).join("L")}Z`;
const ys = (shapes) => shapes.flatMap((s) => s.positions.filter((_, i) => i % 3 === 1));

describe("insetRing", () => {
  it("moves every wall in by d", () => {
    const inner = insetRing(rect(0, 0, 10, 10), 2);
    expect(inner.map((p) => p.map(Math.round)).sort()).toEqual(rect(2, 2, 6, 6).sort());
    expect(insetRing([...rect(0, 0, 10, 10)].reverse(), 2).every((p) => inRing(p, rect(1, 1, 8, 8)))).toBe(true);
  });
  it("gives up on a ring too thin or too jagged for it", () => {
    expect(insetRing(rect(0, 0, 10, 3), 2)).toBe(null);
    expect(insetRing([[0, 0], [10, 0], [10, 5], [9, 5], [9, 6], [10, 6], [10, 10], [0, 10]], 2)).toBe(null); // a 1 m notch
    expect(insetRing(rect(0, 0, 10, 10), 0)).toBe(null);
  });
});

describe("extrudeRings with tiers", () => {
  it("slopes the roof in and up, and stays over the outline", () => {
    const ring = rect(0, 0, 20, 12);
    const [flat] = extrudeRings([ring], 10);
    const [hip] = extrudeRings([ring], 10, { tiers: [[4, 2]] });
    expect(Math.max(...ys([hip]))).toBe(12);
    expect(hip.wallVerts).toBe(flat.wallVerts);
    expect(hip.positions.length).toBeGreaterThan(flat.positions.length);
    expect(Math.max(...hip.indices)).toBeLessThan(hip.positions.length / 3);
    for (let i = hip.wallVerts * 3; i < hip.positions.length; i += 3) expect(inRing([hip.positions[i] * 0.999 + 0.01, hip.positions[i + 2] * 0.999 + 0.006], ring)).toBe(true);
  });
  it("keeps a flat top when the ring has no room", () => {
    expect(extrudeRings([rect(0, 0, 20, 3)], 10, { tiers: [[4, 2]] })).toEqual(extrudeRings([rect(0, 0, 20, 3)], 10));
  });
});

describe("roofOf", () => {
  const hall = { h: 14, path: path(rect(0, 0, 40, 20)) };
  it("uses OSM's roof:shape when it is tagged", () => {
    expect(roofOf({ ...hall, roofShape: "flat" })).toBe("flat");
    expect(roofOf({ ...hall, roofShape: "gabled" })).toBe("hip");
    expect(roofOf({ ...hall, roofShape: "dome" })).toBe("round");
  });
  it("guesses when it is not: halls are hipped, big footprints and towers flat, arenas round", () => {
    expect(roofOf(hall)).toBe("hip");
    expect(roofOf({ h: 14, path: path(rect(0, 0, 100, 60)) })).toBe("flat");
    expect(roofOf({ ...hall, h: 40 })).toBe("flat");
    expect(roofOf({ ...hall, name: "Crisp Indoor Practice Facility" })).toBe("round");
  });
  it("leaves decks, the quiet town and flat areas plain", () => {
    expect(roofOf({ ...hall, plain: true })).toBe("plain");
    expect(roofOf({ ...hall, h: 0.3 })).toBe("plain");
    expect(roofOf(null)).toBe("plain");
  });
});

describe("roofedShapes", () => {
  it("puts the ridge of a hipped roof along the long side, by the pitch", () => {
    const b = { id: "a", h: 10, path: path(rect(0, 0, 40, 10)) };
    const [[inset, rise]] = roofTiers(pathToRings(b.path)[0], "hip");
    expect(rise).toBeCloseTo(inset * ROOF.pitch);
    const [s] = roofedShapes(b);
    const top = [];
    for (let i = 0; i < s.positions.length; i += 3) if (s.positions[i + 1] > 10.01) top.push([s.positions[i], s.positions[i + 2]]);
    const span = (k) => Math.max(...top.map((p) => p[k])) - Math.min(...top.map((p) => p[k]));
    expect(span(0)).toBeGreaterThan(span(1) * 3); // the flat top runs the long way
  });
  it("rounds a hall's roof in a few slopes, each flatter than the last", () => {
    const tiers = roofTiers(rect(0, 0, 80, 50), "round");
    expect(tiers.length).toBeGreaterThan(2);
    const slopes = tiers.map(([d, y], i) => (y - (tiers[i - 1]?.[1] || 0)) / (d - (tiers[i - 1]?.[0] || 0)));
    slopes.forEach((s, i) => i && expect(s).toBeLessThan(slopes[i - 1]));
  });
  it("gives a flat roof a light rim and units that stay inside it", () => {
    const ring = rect(0, 0, 100, 60);
    const shapes = roofedShapes({ id: "big", h: 12, path: path(ring) });
    const trim = shapes.filter((s) => s.trim);
    expect(trim.length).toBeGreaterThan(2); // the rim and at least two units
    for (const s of trim) for (let i = 0; i < s.positions.length; i += 3) expect(inRing([s.positions[i] * 0.999 + 0.05, s.positions[i + 2] * 0.999 + 0.03], ring)).toBe(true);
    expect(Math.max(...ys(shapes))).toBeCloseTo(12 + ROOF.lip + ROOF.unit[2]);
  });
  it("roofs the real campus: most halls get slopes, and every shape is sound", () => {
    const onCampus = insideOf(nature.campus);
    const halls = campus.buildings.filter((b) => onCampus(b.c) && roofOf(b) === "hip");
    expect(halls.length).toBeGreaterThan(100);
    const sloped = halls.filter((b) => Math.max(...ys(roofedShapes(b))) > b.h + 0.5);
    expect(sloped.length).toBeGreaterThan(halls.length * 0.9);
    const merged = mergeBuildings(campus.buildings);
    expect(merged.positions.every(Number.isFinite)).toBe(true);
    expect(merged.indices.reduce((a, b) => Math.max(a, b), 0)).toBeLessThan(merged.positions.length / 3);
    expect(merged.triOwner.length).toBe(merged.indices.length / 3);
  });
});

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

describe("ridge roofs (#194)", () => {
  it("knows an about rectangular ring, long side first, and nothing else", () => {
    expect(asRectangle(rect(0, 0, 10, 30))[0]).toEqual([10, 0]); // turned so the long side comes first
    expect(asRectangle(rect(0, 0, 30, 10))[0]).toEqual([0, 0]);
    expect(asRectangle([[0, 0], [30, 0], [36, 10], [0, 10]])).toBe(null); // a slanted end
    expect(asRectangle([[0, 0], [30, 0], [30, 10], [10, 10], [0, 10]])).toBe(null); // five corners
  });
  it("brings a narrow hall to a ridge along its long side, by the pitch", () => {
    const [s] = roofedShapes({ id: "n", h: 10, path: path(rect(0, 0, 40, 10)) });
    const top = Math.max(...ys([s]));
    expect(top).toBeCloseTo(10 + 5 * ROOF.pitch);
    const ridge = [];
    for (let i = 0; i < s.positions.length; i += 3) if (s.positions[i + 1] > top - 1e-6) ridge.push([s.positions[i], s.positions[i + 2]]);
    expect(new Set(ridge.map((p) => p[1]))).toEqual(new Set([5])); // down the middle
    expect(Math.min(...ridge.map((p) => p[0]))).toBeCloseTo(5); // hipped: stops half the width in
    expect(facesOut(s)).toBe(true);
  });
  it("gives a gabled hall upright brick ends and a ridge that runs end to end", () => {
    const s = ridgeRoof(rect(0, 0, 40, 10), 10, true);
    const xs = [];
    for (let i = 0; i < s.positions.length; i += 3) if (s.positions[i + 1] > 12) xs.push(s.positions[i]);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(40);
    expect(s.wallVerts).toBe(4 * 4 + 2 * 3); // four walls and two gable triangles count as wall
    expect(facesOut(s)).toBe(true);
    expect(roofedShapes({ id: "g", h: 10, roofShape: "gabled", path: path(rect(0, 0, 60, 30)) })[0].wallVerts).toBe(4 * 4 + 2 * 3);
  });
  it("can put a gable on one end and a hip on the other (#200)", () => {
    const s = ridgeRoof(rect(0, 0, 40, 10), 10, [false, true]);
    const xs = [];
    for (let i = 0; i < s.positions.length; i += 3) if (s.positions[i + 1] > 12) xs.push(s.positions[i]);
    expect(Math.min(...xs)).toBeCloseTo(5); // hip at the start: the ridge stops half the width in
    expect(Math.max(...xs)).toBeCloseTo(40); // gable at the end: the ridge runs to the wall
    expect(s.wallVerts).toBe(4 * 4 + 3); // one gable triangle
    expect(facesOut(s)).toBe(true);
  });
  it("keeps the flat topped hip on wide halls that are not tagged gabled", () => {
    const [s] = roofedShapes({ id: "w", h: 10, path: path(rect(0, 0, 60, 30)) });
    expect(s.wallVerts).toBe(16);
    expect(Math.max(...ys([s]))).toBeCloseTo(10 + ROOF.maxInset * ROOF.pitch);
  });
});

describe("wings (#194)", () => {
  const L = [[0, 0], [40, 0], [40, 12], [12, 12], [12, 30], [0, 30]];
  it("splits an L into two long wings that overlap at the corner", () => {
    const w = wings(L);
    expect(w).toHaveLength(2);
    const size = (r) => [Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]), Math.hypot(r[2][0] - r[1][0], r[2][1] - r[1][1])].map(Math.round);
    expect(w.map(size).sort()).toEqual([[30, 12], [40, 12]]); // each runs its full length, long side first
  });
  it("covers a U with three wings, and turns with the building", () => {
    const U = [[0, 0], [50, 0], [50, 30], [38, 30], [38, 12], [12, 12], [12, 30], [0, 30]];
    expect(wings(U)).toHaveLength(3);
    const turn = (p) => [p[0] * 0.8 - p[1] * 0.6, p[0] * 0.6 + p[1] * 0.8];
    expect(wings(U.map(turn))).toHaveLength(3);
  });
  it("gives up on long slanted walls, and allows small cut corners", () => {
    expect(wings([[0, 0], [40, 0], [40, 12], [12, 30], [0, 30]])).toBe(null);
    const cut = wings([[0, 0], [40, 0], [40, 10], [38, 12], [12, 12], [12, 30], [0, 30]]);
    const long = (r) => Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]);
    expect(cut.filter((r) => long(r) >= 30)).toHaveLength(2); // both wings, maybe a small box at the cut corner too
  });
  it("brings each wing of a real L hall to a ridge, and every face shows from outside", () => {
    const shapes = roofedShapes({ id: "l", h: 10, path: path(L) });
    expect(Math.max(...ys(shapes))).toBeCloseTo(10 + 6 * ROOF.pitch);
    for (const s of shapes.filter((x) => x.wallVerts === 0 && x.indices.length > 6)) expect(facesOut(s)).toBe(true);
  });
});

