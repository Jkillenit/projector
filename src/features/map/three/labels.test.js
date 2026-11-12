import { describe, expect, it } from "vitest";
import { footprint, labelBox, thinLabels } from "./labels.js";

const at = (id, x, y, rank, name = "Hall") => ({ id, box: labelBox(name, x, y), rank });

describe("labelBox", () => {
  it("centers the box and grows with the name", () => {
    const b = labelBox("Gorgas", 100, 50);
    expect(b.x + b.w / 2).toBe(100);
    expect(b.y + b.h / 2).toBe(50);
    expect(labelBox("Gorgas Library", 0, 0).w).toBeGreaterThan(b.w);
  });
});

describe("footprint", () => {
  it("measures a square either way round, and nothing for bad paths", () => {
    expect(footprint("M0 0L10 0L10 10L0 10Z")).toBe(100);
    expect(footprint("M0 0L0 10L10 10L10 0Z")).toBe(100);
    expect(footprint("")).toBe(0);
  });
});

describe("thinLabels", () => {
  it("keeps the bigger place when two names collide", () => {
    expect([...thinLabels([at("small", 100, 100, 1), at("big", 110, 102, 9)])]).toEqual(["big"]);
  });

  it("shows both when they are apart", () => {
    expect(thinLabels([at("a", 100, 100, 1), at("b", 300, 100, 1)]).size).toBe(2);
  });

  it("thins out as you zoom out", () => {
    const row = (spread) => [0, 1, 2, 3, 4, 5].map((i) => at(`b${i}`, 400 + i * spread, 300, i));
    const near = thinLabels(row(120), [], { w: 1200, h: 600 }).size;
    const far = thinLabels(row(20), [], { w: 1200, h: 600 }).size;
    expect(near).toBe(6);
    expect(far).toBeLessThan(near);
  });

  it("lets a picked place win with a top rank", () => {
    expect([...thinLabels([at("big", 100, 100, 500), at("picked", 105, 100, Infinity)])]).toEqual(["picked"]);
  });

  it("never covers a pin", () => {
    const pin = { x: 90, y: 90, w: 28, h: 28 };
    expect(thinLabels([at("a", 100, 100, 9)], [pin]).size).toBe(0);
  });

  it("drops names that run off screen", () => {
    expect(thinLabels([at("edge", 5, 100, 1)], [], { w: 800, h: 600 }).size).toBe(0);
  });
});
