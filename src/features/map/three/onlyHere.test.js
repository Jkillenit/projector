import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// #53: `three` loads only inside src/features/map/three/, and only with a dynamic import(), so the 2D map stays small.
// Read from disk with fileURLToPath, not import.meta.glob: Vite's fs guard denies the glob on Windows when the drive letter is lowercase (#206).
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.jsx?$/.test(p) && !p.endsWith(".test.js") ? [p] : [];
  });
const sources = Object.fromEntries(
  walk(join(ROOT, "src")).map((p) => ["/" + relative(ROOT, p).split(sep).join("/"), readFileSync(p, "utf8")]),
);
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
