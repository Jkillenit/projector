import { describe, expect, it } from "vitest";
import { addRibbons, GROUND_LAYERS, lineToRibbon, mergeBuildings, roadWidth } from "./campusMesh.js";
import nature from "../campus-nature.json";
import campus from "../campus.json";

const SQUARE = "M0 0L10 0L10 10L0 10Z";

describe("mergeBuildings", () => {
  it("puts every building in one shape and remembers whose triangles are whose", () => {
    const m = mergeBuildings([
      { id: "a", path: SQUARE, h: 10 },
      { id: "b", path: "M20 0L30 0L30 10L20 10Z", h: 5 },
    ]);
    expect(m.owners.map((o) => o.id)).toEqual(["a", "b"]);
    expect(m.owners[0].start).toBe(0);
    expect(m.owners[1].start).toBe(m.owners[0].end);
    expect(m.owners[1].end).toBe(m.positions.length / 3);
    expect(m.triOwner).toHaveLength(m.indices.length / 3);
    // Each triangle's corners sit in its owner's vertex range.
    m.triOwner.forEach((id, t) => {
      const o = m.owners.find((x) => x.id === id);
      for (const v of m.indices.slice(t * 3, t * 3 + 3)) expect(v >= o.start && v < o.end).toBe(true);
    });
  });

  it("skips buildings with no shape or no height", () => {
    expect(mergeBuildings([{ id: "x", path: "", h: 10 }, { id: "y", path: SQUARE, h: 0 }]).owners).toEqual([]);
    expect(mergeBuildings(undefined).positions).toEqual([]);
  });

  it("finds the area under a triangle, like it does for buildings (#118)", () => {
    const m = mergeBuildings(campus.areas.map((a) => ({ id: a.id, path: a.path, h: 0.3 })));
    expect(m.owners.length).toBe(campus.areas.length);
    expect(m.triOwner).toHaveLength(m.indices.length / 3);
    expect(new Set(m.triOwner)).toEqual(new Set(campus.areas.map((a) => a.id)));
  });

  it("handles the whole campus", () => {
    const m = mergeBuildings(campus.buildings);
    expect(m.owners.length).toBeGreaterThan(campus.buildings.length * 0.95);
    expect(Math.max(...m.indices)).toBe(m.positions.length / 3 - 1);
  });
});

describe("lineToRibbon", () => {
  it("puts the edges half the width to each side of a straight line", () => {
    expect(lineToRibbon([[0, 0], [10, 0]], 4)).toEqual({ left: [[0, 2], [10, 2]], right: [[0, -2], [10, -2]] });
  });

  it("keeps the width around a square corner", () => {
    const { left, right } = lineToRibbon([[0, 0], [10, 0], [10, 10]], 2);
    expect(left[1][0]).toBeCloseTo(9);
    expect(left[1][1]).toBeCloseTo(1);
    expect(right[1][0]).toBeCloseTo(11);
    expect(right[1][1]).toBeCloseTo(-1);
  });

  it("caps a sharp corner and survives a line that turns straight back", () => {
    const { left } = lineToRibbon([[0, 0], [10, 0], [0, 0.1]], 2);
    expect(Math.hypot(left[1][0] - 10, left[1][1])).toBeLessThanOrEqual(2.001);
    expect(lineToRibbon([[0, 0], [10, 0], [0, 0]], 2).left.flat().every(Number.isFinite)).toBe(true);
  });

  it("drops repeated points and ignores bad input", () => {
    expect(lineToRibbon([[0, 0], [0, 0], [5, 0]], 2).left).toHaveLength(2);
    expect(lineToRibbon([[1, 1]], 2).left).toEqual([]);
    expect(lineToRibbon([[0, 0], [1, 0]], 0).left).toEqual([]);
    expect(lineToRibbon(undefined, 2).left).toEqual([]);
  });
});

describe("addRibbons", () => {
  // Share of triangles that face up.
  const upward = ({ positions: p, indices: ix }) => {
    let up = 0;
    for (let t = 0; t < ix.length; t += 3) {
      const [a, b, c] = [ix[t], ix[t + 1], ix[t + 2]].map((v) => [p[v * 3], p[v * 3 + 2]]);
      if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) > 0) up++;
    }
    return up / (ix.length / 3);
  };

  it("turns each line into two triangles per segment, facing up", () => {
    const s = addRibbons({ positions: [], indices: [] }, "M0 0L10 0L10 10M-5 -5L-5 5", 2);
    expect(s.positions).toHaveLength((3 + 2) * 2 * 3);
    expect(s.indices).toHaveLength((2 + 1) * 6);
    expect(upward(s)).toBe(1);
  });

  it("draws every campus road and path", () => {
    const s = { positions: [], indices: [] };
    for (const [type, d] of Object.entries(nature.roads)) addRibbons(s, d, roadWidth(type));
    addRibbons(s, nature.paths, 2.5);
    expect(s.indices.length).toBeGreaterThan(1000);
    expect(Math.max(...s.indices)).toBe(s.positions.length / 3 - 1);
    expect(s.positions.every(Number.isFinite)).toBe(true);
    // A tight bend can fold a sliver over on the inside; the view draws both sides, so it only needs to be rare.
    expect(upward(s)).toBeGreaterThan(0.98);
  });
});

describe("ground layers", () => {
  const at = (k) => GROUND_LAYERS.indexOf(k);
  it("draws water over grass and woods, roads over lots and water, paths on top", () => {
    expect(at("water")).toBeGreaterThan(at("grass"));
    expect(at("water")).toBeGreaterThan(at("wood"));
    expect(at("roads")).toBeGreaterThan(at("parking"));
    expect(at("roads")).toBeGreaterThan(at("water"));
    expect(GROUND_LAYERS.at(-1)).toBe("paths");
  });
  it("has a layer in campus-nature.json for every name", () => {
    for (const k of GROUND_LAYERS) expect(nature[k]).toBeTruthy();
  });
  it("makes main roads wider than side roads", () => {
    expect(roadWidth("primary")).toBeGreaterThan(roadWidth("residential"));
    expect(roadWidth("residential")).toBeGreaterThan(roadWidth("service"));
    expect(roadWidth("unknown")).toBeGreaterThan(0);
  });
});
