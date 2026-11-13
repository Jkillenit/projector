import { describe, expect, it } from "vitest";
import { extrudeRings, inRing, insetRing, pathToRings } from "./extrude.js";
import { ROOF, roofedShapes, roofOf, roofTiers } from "./roofs.js";
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
    expect(Math.max(...merged.indices)).toBeLessThan(merged.positions.length / 3);
    expect(merged.triOwner.length).toBe(merged.indices.length / 3);
  });
});
