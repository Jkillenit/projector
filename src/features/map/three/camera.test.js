import { describe, expect, it } from "vitest";
import { ease, flyPath, viewFor } from "./camera.js";

const from = { position: [0, 100, 100], target: [0, 0, 0] };
const to = { position: [200, 300, 500], target: [200, 0, 400] };

describe("flyPath", () => {
  it("starts where the camera is and ends at the place", () => {
    expect(flyPath(from, to, 0)).toEqual(from);
    expect(flyPath(from, to, 1)).toEqual(to);
  });

  it("is halfway in the middle, and eased on the way", () => {
    expect(flyPath(from, to, 0.5)).toEqual({ position: [100, 200, 300], target: [100, 0, 200] });
    expect(flyPath(from, to, 0.1).target[0]).toBeLessThan(20); // slow start
    expect(flyPath(from, to, 0.9).target[0]).toBeGreaterThan(180); // slow end
  });

  it("clamps t", () => {
    expect(flyPath(from, to, -1)).toEqual(from);
    expect(flyPath(from, to, 2)).toEqual(to);
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
