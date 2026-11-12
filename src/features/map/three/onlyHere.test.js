import { describe, expect, it } from "vitest";

// #53: `three` loads only inside src/features/map/three/, and only with a dynamic import(), so the 2D map stays small.
const sources = import.meta.glob(["/src/**/*.{js,jsx}", "!/src/**/*.test.js"], { query: "?raw", import: "default", eager: true });
const STATIC = /(^|\n)\s*import\s[^;]*?from\s*["']three(\/[^"']*)?["']|(^|\n)\s*import\s*["']three(\/[^"']*)?["']/;
const ANY = /["']three(\/[^"']*)?["']/;

describe("three stays in the 3D map", () => {
  it("is only named inside src/features/map/three/", () => {
    expect(Object.keys(sources)).toContain("/src/features/map/MapScreen.jsx");
    const outside = Object.keys(sources).filter((f) => !f.startsWith("/src/features/map/three/") && ANY.test(sources[f]));
    expect(outside).toEqual([]);
  });

  it("is never imported statically", () => {
    expect(Object.keys(sources).filter((f) => STATIC.test(sources[f]))).toEqual([]);
  });

  it("catches a static import", () => {
    expect(STATIC.test('import * as THREE from "three";')).toBe(true);
    expect(STATIC.test('import { OrbitControls } from "three/addons/controls/OrbitControls.js";')).toBe(true);
    expect(STATIC.test('const THREE = await import("three");')).toBe(false);
  });
});
