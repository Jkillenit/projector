import { describe, expect, it } from "vitest";
import { BRICK, TILE, worldUV } from "./textures.js";
import { heightOf } from "../campusMap.js";

describe("worldUV", () => {
  it("gives one tile every `tile` meters, from x and z", () => {
    expect([...worldUV([0, 5, 0, 24, 5, 48], 24)]).toEqual([0, 0, 1, 2]);
  });

  it("repeats by world size, so a big lawn gets more tiles, not a stretched one", () => {
    const small = worldUV([0, 0, 0, 30, 0, 0], TILE.grass);
    const big = worldUV([0, 0, 0, 300, 0, 0], TILE.grass);
    expect(big[2] / small[2]).toBeCloseTo(10);
  });

  it("puts one window row per floor: a brick tile is one floor tall", () => {
    // heightOf rounds to whole meters; the leftover strip under the roof is plain brick.
    expect(Math.floor(heightOf({ "building:levels": "3" }) / BRICK.floor)).toBe(3);
  });

  it("has a tile size for every texture", () => {
    for (const kind of ["grass", "asphalt", "concrete", "water", "roof"]) expect(TILE[kind]).toBeGreaterThan(0);
  });
});
