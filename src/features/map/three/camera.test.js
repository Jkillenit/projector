import { describe, expect, it } from "vitest";
import { blend, cameraFrom, clipFor, distanceFor, ease, MODES, poseFor, poseOf, SIZE_RANGE, viewFor } from "./camera.js";

const close = (a, b) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe("poseFor and cameraFrom", () => {
  it("Map looks straight down at the spot", () => {
    const c = cameraFrom(poseFor("map", [100, 200]));
    expect(c.target).toEqual([100, 0, 200]);
    close([c.position[0], c.position[2]], [100, 200]);
    expect(c.position[1]).toBeCloseTo(distanceFor(MODES.map.size, MODES.map.fov));
  });

  it("2.5D is the same lens tilted 35 degrees, from the south", () => {
    const p = poseFor("tilt", [0, 0]);
    expect(p.fov).toBe(MODES.map.fov);
    const c = cameraFrom(p);
    expect(c.position[0]).toBeCloseTo(0);
    expect(Math.atan2(c.position[2], c.position[1]) * (180 / Math.PI)).toBeCloseTo(35);
  });

  it("shows the same meters whatever the lens", () => {
    for (const mode of Object.keys(MODES)) {
      const c = cameraFrom(poseFor(mode, [0, 0], 500));
      const d = Math.hypot(...c.position);
      expect(2 * d * Math.tan((c.fov * Math.PI) / 360)).toBeCloseTo(500);
    }
  });

  it("clips nothing at any zoom", () => {
    for (const { fov } of Object.values(MODES)) {
      const { near, far } = clipFor(fov);
      expect(near).toBeLessThan(distanceFor(SIZE_RANGE[0], fov) - 100); // tall buildings stay in front of the near plane
      expect(far).toBeGreaterThan(distanceFor(SIZE_RANGE[1], fov) + 5000); // the ground behind stays drawn
    }
  });

  it("round trips through poseOf", () => {
    const p = { target: [30, -40], size: 700, tilt: 50, azimuth: 1.2, fov: 45 };
    const back = poseOf(cameraFrom(p), 45);
    close(back.target, p.target);
    for (const k of ["size", "tilt", "azimuth"]) expect(back[k]).toBeCloseTo(p[k], 6);
  });
});

describe("blend", () => {
  const a = { target: [0, 0], size: 1000, tilt: 0, azimuth: 0, fov: 6 };
  const b = { target: [200, 400], size: 250, tilt: 50, azimuth: 0, fov: 45 };

  it("starts at a, ends at b, and clamps t", () => {
    expect(blend(a, b, -1)).toEqual(a);
    expect(blend(a, b, 0)).toEqual(a);
    const end = blend(a, b, 2);
    close(end.target, b.target);
    expect(end.size).toBeCloseTo(b.size);
    expect(end.tilt).toBe(b.tilt);
  });

  it("is halfway in the middle, with zoom by ratio", () => {
    const mid = blend(a, b, 0.5);
    expect(mid.target).toEqual([100, 200]);
    expect(mid.tilt).toBe(25);
    expect(mid.size).toBeCloseTo(500); // halfway between 1000 and 250 by ratio
  });

  it("keeps the same spot in view while switching modes", () => {
    const from = poseFor("map", [50, 60], 900);
    const to = poseFor("3d", [50, 60], 900);
    for (const t of [0.25, 0.5, 0.75]) expect(blend(from, to, t).target).toEqual([50, 60]);
  });

  it("turns the short way round", () => {
    const mid = blend({ ...a, azimuth: 3 }, { ...a, azimuth: -3 }, 0.5);
    expect(Math.abs(mid.azimuth)).toBeGreaterThan(3); // through pi, not through 0
  });
});

describe("ease", () => {
  it("goes from 0 to 1 and never backward", () => {
    let last = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      expect(ease(t)).toBeGreaterThanOrEqual(last);
      last = ease(t);
    }
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });
});

describe("viewFor", () => {
  it("looks at the place from the south and above", () => {
    const v = viewFor({ c: [10, 20], h: 0 });
    expect(v.target).toEqual([10, 0, 20]);
    expect(v.position[1]).toBeGreaterThan(0);
    expect(v.position[2]).toBeGreaterThan(20);
  });
  it("backs up for tall buildings", () => {
    expect(viewFor({ c: [0, 0], h: 60 }).position[2]).toBeGreaterThan(viewFor({ c: [0, 0], h: 10 }).position[2]);
  });
});
