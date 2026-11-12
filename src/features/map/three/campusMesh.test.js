import { describe, expect, it } from "vitest";
import { mergeBuildings, roadSegments } from "./campusMesh.js";
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

  it("handles the whole campus", () => {
    const m = mergeBuildings(campus.buildings);
    expect(m.owners.length).toBeGreaterThan(campus.buildings.length * 0.95);
    expect(Math.max(...m.indices)).toBe(m.positions.length / 3 - 1);
  });
});

describe("roadSegments", () => {
  it("turns each line into segments at a height", () => {
    expect(roadSegments("M0 0L10 0L10 5M-1 -2L3 4", 0.2)).toEqual([
      0, 0.2, 0, 10, 0.2, 0,
      10, 0.2, 0, 10, 0.2, 5,
      -1, 0.2, -2, 3, 0.2, 4,
    ]);
  });
  it("ignores bad input", () => {
    expect(roadSegments(undefined)).toEqual([]);
    expect(roadSegments("M1 2")).toEqual([]);
  });
});
