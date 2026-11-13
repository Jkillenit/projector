import { describe, expect, it } from "vitest";
import { groundShade, SHADE_REACH, shaded, shadeLines } from "./shade.js";
import { inRing } from "./extrude.js";

const square = [[0, 0], [10, 0], [10, 10], [0, 10]];

describe("groundShade", () => {
  it("rings a building with a band that is dark at the wall and clear at its edge", () => {
    const s = groundShade([square], 4);
    expect(s.positions.length / 3).toBe(8);
    expect(s.indices.length).toBe(24);
    expect(s.colors.length).toBe(8 * 4);
    for (let v = 0; v < 8; v++) {
      const p = [s.positions[v * 3], s.positions[v * 3 + 2]];
      const atWall = v % 2 === 0;
      expect(s.colors[v * 4 + 3]).toBe(atWall ? 1 : 0);
      expect(s.positions[v * 3 + 1]).toBe(0);
      if (!atWall) {
        expect(inRing(p, square)).toBe(false); // the band goes out, never under the building
        expect(Math.max(Math.abs(p[0] - 5), Math.abs(p[1] - 5))).toBeCloseTo(9);
      }
    }
  });
  it("goes out whichever way the outline is drawn, and skips bad rings", () => {
    const s = groundShade([[...square].reverse(), [[0, 0], [1, 1]], [[0, 0], [1, 1], [2, 2]]]);
    expect(s.positions.length / 3).toBe(8);
    for (let v = 1; v < 8; v += 2) expect(Math.max(Math.abs(s.positions[v * 3] - 5), Math.abs(s.positions[v * 3 + 2] - 5))).toBeCloseTo(5 + SHADE_REACH);
    expect(groundShade(null).indices).toEqual([]);
  });
});

describe("shaded", () => {
  it("writes only the lines its options ask for", () => {
    expect(shadeLines()).toContain("diffuseColor *= sampledDiffuseColor");
    expect(shadeLines()).not.toMatch(/fwidth|shadeNoise|vShadeLocal/);
    expect(shadeLines({ detail: { mean: 0.8, near: 0.3, far: 1 } })).toContain("vec3(0.8000)");
    expect(shadeLines({ macro: 0.05 })).toContain("0.1000 * (");
    expect(shadeLines({ base: { dark: 0.7, height: 7 } })).toContain("vShadeWorld.y");
    expect(shadeLines({ crown: { dark: 0.6, light: 1.1 } })).toContain("vShadeLocal.y");
  });
  it("adds them to three's shader in place of its texture step, one program per mix of options", () => {
    const [a, b] = [shaded({}, { macro: 0.05 }), shaded({}, { macro: 0.09 })];
    expect(a.customProgramCacheKey()).not.toBe(b.customProgramCacheKey());
    const shader = { vertexShader: "#include <common>\n#include <begin_vertex>", fragmentShader: "#include <common>\n#include <map_fragment>\n#include <color_fragment>" };
    a.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain("vShadeWorld = (modelMatrix * shadeAt).xyz;");
    expect(shader.vertexShader).toContain("#include <begin_vertex>");
    expect(shader.fragmentShader).not.toContain("#include <map_fragment>");
    expect(shader.fragmentShader).toContain("shadeNoise(vShadeWorld.xz");
    expect(shader.fragmentShader).toContain("#include <color_fragment>");
  });
});
