import { describe, expect, it } from "vitest";
import { BOWL, BOWL_PARTS, courtFrame, COURT, diamondFrame, fieldLook, fieldUV, HOME_U, hull, insetBand, longAxis, markedFields, MIN_TRACK, OVAL, rayOut, trackOval, TRACK, stadiumBowl, underBowl, WARNING_TRACK } from "./fields.js";
import { inRing } from "./trees.js";
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
  it("uses a diamond's inner ring to place home plate, not as a field of its own", () => {
    const fake = { sports: { baseball: "M0 0L100 0L100 100L0 100ZM10 10L30 10L30 30L10 30Z" } };
    const out = markedFields(fake);
    expect(out.filter((f) => f.look === "diamond").length).toBe(1);
    expect(out.filter((f) => f.look === "dirt" && f.shape).length).toBe(1); // the warning track
  });
  it("gives the football field inside the stadium its own look", () => {
    const stadium = pathToRings(campus.areas.find((a) => a.name === "Bryant-Denny Stadium").path)[0];
    const looks = markedFields(nature, { stadium }).map((f) => f.look);
    expect(looks.filter((l) => l === "stadium").length).toBe(1);
    expect(looks).toContain("football");
  });
});

describe("track ovals (#163)", () => {
  const complex = pathToRings(campus.areas.find((a) => /Sam Bailey/.test(a.name)).path)[0];
  const tracks = markedFields(nature, { tracks: [complex] }).filter((f) => f.look === "track");
  const xz = (p) => Array.from({ length: p.length / 3 }, (_, i) => [p[i * 3], p[i * 3 + 2]]);
  it("gives Sam Bailey one oval, not its runways and pits", () => {
    const here = tracks.filter((f) => (f.ring || xz(f.shape.positions)).some((p) => inRing(p, complex)));
    expect(here.length).toBe(1);
    expect(here[0].ring).toBe(undefined);
    for (const p of xz(here[0].shape.positions)) expect(inRing(p, complex)).toBe(true);
  });
  it("keeps whole tracks from OSM and drops small pieces", () => {
    const fake = { sports: { athletics: "M0 0L10 0L10 10L0 10Z" }, track: "M0 0L200 0L200 100L0 100ZM300 0L310 0L310 5L300 5Z" };
    const out = markedFields(fake);
    expect(out.length).toBe(1);
    expect(MIN_TRACK).toBeLessThan(200 * 100);
  });
  it("lays a 400 m inner lane, 8 lanes wide, tiled along the lanes", () => {
    const { shape, uv } = trackOval({ center: [5, 7], along: [0, 1] });
    expect(uv.length).toBe((shape.positions.length / 3) * 2);
    expect(uv[uv.length - 2] * TRACK.along).toBeCloseTo(2 * OVAL.straight + 2 * Math.PI * OVAL.radius, -1);
    const pts = xz(shape.positions);
    expect(Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])).toBeCloseTo(TRACK.lanes);
    expect(Math.max(...pts.map(([, z]) => z)) - 7).toBeCloseTo(OVAL.straight / 2 + OVAL.radius + TRACK.lanes);
  });
});

describe("diamondFrame", () => {
  // A quarter circle fan: home at the corner (0, 0), the outfield toward +x +z.
  const fan = [[0, 0], ...Array.from({ length: 9 }, (_, i) => [100 * Math.cos((i * Math.PI) / 16), 100 * Math.sin((i * Math.PI) / 16)])];
  it("finds home where the foul lines meet, in from the backstop, facing the outfield", () => {
    const f = diamondFrame(fan, null, "softball");
    expect(f.toward[0]).toBeCloseTo(Math.SQRT1_2, 1);
    expect(f.toward[1]).toBeCloseTo(Math.SQRT1_2, 1);
    expect(Math.hypot(...f.home)).toBeCloseTo(8, 0);
  });
  it("puts home behind the infield ring when OSM has one", () => {
    const infield = [[20, 20], [35, 20], [35, 35], [20, 35]];
    const f = diamondFrame(fan, infield);
    expect(f.toward[0]).toBeGreaterThan(0.5);
    expect(f.toward[1]).toBeGreaterThan(0.5);
    expect(Math.hypot(f.home[0] - 27.5, f.home[1] - 27.5)).toBeCloseTo(27.43 / Math.SQRT2, 1);
  });
  it("gives up on a plain box", () => {
    expect(diamondFrame([[0, 0], [100, 0], [100, 40], [0, 40]])).toBe(null);
  });
  it("faces Sewell-Thomas toward its outfield, away from the stands", () => {
    const d = markedFields(nature).filter((f) => f.look === "diamond" && f.frame.home);
    expect(d.length).toBe(2);
    const sewell = d.find((f) => f.ring.some(([x]) => x > 250 && x < 400));
    expect(sewell.frame.toward[1]).toBeGreaterThan(0.9); // the stands are on the north side
  });
  it("lays the texture from home plate at real size", () => {
    const frame = { home: [10, 10], toward: [0, 1], tile: 130 };
    const uv = fieldUV([10, 0, 10, 10, 0, 140], frame, "diamond");
    expect(uv[0]).toBeCloseTo(HOME_U);
    expect(uv[1]).toBeCloseTo(0.5);
    expect(uv[2]).toBeCloseTo(HOME_U + 1);
  });
});

describe("insetBand", () => {
  it("lays a band just inside the ring, any way the ring turns", () => {
    for (const ring of [[[0, 0], [50, 0], [50, 50], [0, 50]], [[0, 50], [50, 50], [50, 0], [0, 0]]]) {
      const { positions, indices } = insetBand(ring, WARNING_TRACK);
      expect(indices.length).toBe(ring.length * 6);
      for (let i = 3; i < positions.length; i += 6) {
        const p = [positions[i], positions[i + 2]];
        expect(inRing(p, ring)).toBe(true);
        expect(Math.min(p[0], p[1], 50 - p[0], 50 - p[1])).toBeCloseTo(WARNING_TRACK);
      }
    }
  });
});

describe("hull and rayOut", () => {
  it("drops notches and finds where a ray leaves", () => {
    const notched = [[0, 0], [10, 0], [10, 10], [5, 6], [0, 10]];
    expect(hull(notched).length).toBe(4);
    expect(rayOut(hull(notched), [5, 5], [1, 0])).toBeCloseTo(5);
    expect(rayOut(hull(notched), [5, 5], [0, 1])).toBeCloseTo(5);
  });
});

describe("stadiumBowl", () => {
  const stadium = pathToRings(campus.areas.find((a) => a.name === "Bryant-Denny Stadium").path)[0];
  const field = pathToRings(campus.areas.find((a) => a.name === "Saban Field").path)[0];
  const bowl = stadiumBowl(stadium, field);
  const ys = (part) => bowl.groups[part].map((i) => bowl.positions[i * 3 + 1]);
  it("builds every part of Bryant-Denny", () => {
    expect(bowl).not.toBe(null);
    for (const part of BOWL_PARTS) expect(bowl.groups[part].length).toBeGreaterThan(0);
    expect(Math.max(...ys("seat"))).toBe(BOWL.top);
    expect(Math.max(...ys("board"))).toBeGreaterThan(BOWL.top);
    expect(bowl.uvs.length).toBe((bowl.positions.length / 3) * 2);
  });
  it("keeps crimson chairbacks to the lower sidelines; the rest of the lower bowl is bleachers", () => {
    expect(Math.max(...ys("bench"))).toBe(BOWL.mid);
    expect(Math.min(...ys("seat"))).toBe(BOWL.pad); // some lower bowl is still crimson
    expect(bowl.groups.bench.length).toBeGreaterThan(bowl.groups.seat.length / 4);
  });
  it("hugs the field: the first row is close to it, but never on it", () => {
    const f = longAxis(field);
    for (const i of bowl.groups.pad) {
      const [x, z] = [bowl.positions[i * 3] - f.center[0], bowl.positions[i * 3 + 2] - f.center[1]];
      const [a, c] = [Math.abs(x * f.along[0] + z * f.along[1]), Math.abs(-x * f.along[1] + z * f.along[0])];
      expect(a > f.length / 2 || c > f.width / 2).toBe(true);
      expect(Math.min(Math.abs(a - f.length / 2), Math.abs(c - f.width / 2))).toBeLessThan(BOWL.end + 1);
    }
  });
  it("stays inside the stadium's outline", () => {
    const edge = hull(stadium);
    for (let i = 0; i < bowl.positions.length; i += 3) {
      const p = [bowl.positions[i], bowl.positions[i + 2]];
      const [cx, cz] = longAxis(field).center;
      expect(inRing([cx + (p[0] - cx) * 0.99, cz + (p[1] - cz) * 0.99], edge)).toBe(true);
    }
  });
  it("gives up when there is no room for stands", () => {
    expect(stadiumBowl(rect(0, 0, 130, 70), rect(10, 10, 110, 49))).toBe(null);
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
