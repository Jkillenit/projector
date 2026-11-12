import { describe, expect, it } from "vitest";
import { TILE, worldUV } from "./textures.js";

describe("worldUV", () => {
  it("gives one tile every `tile` meters, from x and z", () => {
    expect([...worldUV([0, 5, 0, 24, 5, 48], 24)]).toEqual([0, 0, 1, 2]);
  });

  it("repeats by world size, so a big lawn gets more tiles, not a stretched one", () => {
    const small = worldUV([0, 0, 0, 30, 0, 0], TILE.grass);
    const big = worldUV([0, 0, 0, 300, 0, 0], TILE.grass);
    expect(big[2] / small[2]).toBeCloseTo(10);
  });

  it("has a tile size for every texture", () => {
    for (const kind of ["grass", "asphalt", "concrete", "water", "roof"]) expect(TILE[kind]).toBeGreaterThan(0);
  });
});
