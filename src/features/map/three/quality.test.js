import { describe, expect, it } from "vitest";
import { qualityTier, shadowBox, shadowOffset, SUN, TIERS } from "./quality.js";

describe("qualityTier", () => {
  it("gives a phone Low: no real shadows, pixel ratio 1", () => {
    const t = qualityTier({ coarse: true, shortSide: 390, cores: 8 });
    expect(t).toBe(TIERS.low);
    expect(t).toMatchObject({ shadows: false, maxPixelRatio: 1 });
  });
  it("gives a desktop and a tablet High", () => {
    expect(qualityTier({ coarse: false, shortSide: 1080, cores: 8 })).toBe(TIERS.high);
    expect(qualityTier({ coarse: true, shortSide: 834, cores: 8 })).toBe(TIERS.high);
    expect(TIERS.high.shadows).toBe(true);
  });
  it("gives a weak machine Low", () => {
    expect(qualityTier({ coarse: false, shortSide: 1080, cores: 2 })).toBe(TIERS.low);
  });
  it("defaults to High when nothing is known", () => {
    expect(qualityTier()).toBe(TIERS.high);
  });
});

describe("sun and shadows", () => {
  it("lights from the north west, so shadows fall south east (down and right)", () => {
    expect(Math.hypot(...SUN)).toBeCloseTo(1);
    const [dx, dz] = shadowOffset(10);
    expect(dx).toBeGreaterThan(0);
    expect(dz).toBeGreaterThan(0);
  });
  it("covers the whole view and snaps to shadow pixels", () => {
    const { center, half } = shadowBox([123.4, -56.7], 1000, 16 / 9, 4096);
    expect(half * 2).toBeGreaterThan(1000 * (16 / 9));
    const texel = (half * 2) / 4096;
    for (const c of center) expect(Math.abs(c / texel - Math.round(c / texel))).toBeLessThan(1e-6);
    expect(Math.abs(center[0] - 123.4)).toBeLessThanOrEqual(texel / 2);
  });
});
