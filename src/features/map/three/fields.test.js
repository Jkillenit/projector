import { describe, expect, it } from "vitest";
import { courtFrame, COURT, fieldLook, fieldUV, longAxis, markedFields, stadiumBowl, underBowl } from "./fields.js";
import { pathToRings } from "./extrude.js";
import nature from "../campus-nature.json";
import campus from "../campus.json";

const rect = (x, z, l, w, turn = 0) => {
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  return [[0, 0], [l, 0], [l, w], [0, w]].map(([a, b]) => [x + a * c - b * s, z + a * s + b * c]);
};
const flat = (ring) => ring.flatMap(([x, z]) => [x, 0, z]);

describe("fieldLook", () => {
  it("gives each known sport its look and leaves the rest plain", () => {
    expect(fieldLook("american_football")).toBe("football");
    expect(fieldLook("soccer")).toBe("soccer");
    expect(fieldLook("baseball")).toBe("diamond");
    expect(fieldLook("softball")).toBe("diamond");
    expect(fieldLook("tennis")).toBe("court");
    expect(fieldLook("athletics")).toBe("track");
    expect(fieldLook("four_square")).toBe(null);
    expect(fieldLook(undefined)).toBe(null);
  });
});

describe("longAxis", () => {
  it("finds a turned field's long side, size and middle", () => {
    for (const turn of [0, 0.4, Math.PI / 2, 2.5]) {
      const f = longAxis(rect(100, -50, 110, 49, turn));
      expect(f.length).toBeCloseTo(110);
      expect(f.width).toBeCloseTo(49);
      expect(Math.abs(f.along[0] * Math.cos(turn) + f.along[1] * Math.sin(turn))).toBeCloseTo(1);
      const mid = rect(100, -50, 110, 49, turn).reduce(([a, b], [x, z]) => [a + x / 4, b + z / 4], [0, 0]);
      expect(f.center[0]).toBeCloseTo(mid[0]);
      expect(f.center[1]).toBeCloseTo(mid[1]);
    }
  });
  it("turns a box drawn short side first so along is the long side", () => {
    const f = longAxis([[0, 0], [0, 110], [49, 110], [49, 0]]);
    expect(f.length).toBeCloseTo(110);
    expect(Math.abs(f.along[1])).toBeCloseTo(1);
  });
});

describe("courtFrame", () => {
  it("lines courts up the long way even when they sit side by side", () => {
    // 3 courts side by side: the box is longer across the courts (54.9 m) than along them (36.6 m).
    const f = courtFrame(longAxis(rect(0, 0, COURT.width * 3, COURT.length)));
    expect(f.length).toBeCloseTo(COURT.length);
    expect(f.width).toBeCloseTo(COURT.width * 3);
  });
  it("leaves one court alone", () => {
    const f = courtFrame(longAxis(rect(0, 0, COURT.length, COURT.width)));
    expect(f.length).toBeCloseTo(COURT.length);
  });
});

describe("fieldUV", () => {
  it("lays a football field's texture once over its box, any way it turns", () => {
    const ring = rect(10, 10, 110, 49, 0.7);
    const uv = fieldUV(flat(ring), longAxis(ring), "football");
    const us = [...uv].filter((_, i) => i % 2 === 0).sort();
    const vs = [...uv].filter((_, i) => i % 2 === 1).sort();
    expect(us[0]).toBeCloseTo(0);
    expect(us[3]).toBeCloseTo(1);
    expect(vs[0]).toBeCloseTo(0);
    expect(vs[3]).toBeCloseTo(1);
  });
  it("repeats courts at real size", () => {
    const ring = rect(0, 0, COURT.length, COURT.width * 3);
    const uv = fieldUV(flat(ring), courtFrame(longAxis(ring)), "court");
    expect(Math.max(...uv.filter((_, i) => i % 2 === 0))).toBeCloseTo(1);
    expect(Math.max(...uv.filter((_, i) => i % 2 === 1))).toBeCloseTo(3);
  });
});

describe("markedFields", () => {
  const fields = markedFields(nature);
  it("marks the campus's football fields, diamonds, courts and track", () => {
    const looks = new Set(fields.map((f) => f.look));
    for (const look of ["football", "soccer", "diamond", "court", "track"]) expect(looks).toContain(look);
  });
  it("leaves sports with no look plain", () => {
    const marked = new Set(fields.map((f) => JSON.stringify(f.ring)));
    for (const ring of pathToRings(nature.sports.four_square)) expect(marked.has(JSON.stringify(ring))).toBe(false);
  });
  it("gives a diamond's inner ring dirt", () => {
    const fake = { sports: { baseball: "M0 0L100 0L100 100L0 100ZM10 10L30 10L30 30L10 30Z" } };
    expect(markedFields(fake).map((f) => f.look)).toEqual(["diamond", "dirt"]);
  });
});

describe("stadiumBowl", () => {
  const stadium = pathToRings(campus.areas.find((a) => a.name === "Bryant-Denny Stadium").path)[0];
  const field = pathToRings(campus.areas.find((a) => a.name === "Saban Field").path)[0];
  const bowl = stadiumBowl(stadium, field);
  it("builds stands around Bryant-Denny's field, up to the top", () => {
    expect(bowl).not.toBe(null);
    const ys = bowl.positions.filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBe(42);
    expect(Math.min(...ys)).toBe(0);
    expect(bowl.isSeat.length).toBe(bowl.positions.length / 3);
    expect(bowl.isSeat.some(Boolean)).toBe(true);
    expect(Math.max(...bowl.indices)).toBe(bowl.positions.length / 3 - 1);
  });
  it("keeps the stands off the field", () => {
    // Every low point (the bottom row) is outside the field.
    const xs = field.map((p) => p[0]);
    const zs = field.map((p) => p[1]);
    for (let i = 0; i < bowl.positions.length; i += 3) {
      if (bowl.positions[i + 1] !== 3) continue;
      const [x, z] = [bowl.positions[i], bowl.positions[i + 2]];
      expect(x < Math.min(...xs) || x > Math.max(...xs) || z < Math.min(...zs) || z > Math.max(...zs)).toBe(true);
    }
  });
  it("gives up when the field does not fit", () => {
    expect(stadiumBowl(rect(0, 0, 10, 10), rect(-50, -50, 200, 200))).toBe(null);
  });
});

describe("underBowl", () => {
  const stadium = pathToRings(campus.areas.find((a) => a.name === "Bryant-Denny Stadium").path)[0];
  it("finds OSM's stadium building, so it does not cover the field", () => {
    expect(nature.outlines.filter((o) => underBowl(o.path, stadium)).length).toBe(1);
  });
  it("keeps small buildings near or inside it", () => {
    expect(underBowl("M-790 340L-780 340L-780 350L-790 350Z", stadium)).toBe(false);
    expect(underBowl("M0 0L10 0L10 10L0 10Z", stadium)).toBe(false);
  });
});
