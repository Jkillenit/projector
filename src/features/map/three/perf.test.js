import { describe, expect, it } from "vitest";
import { keep, perfLine, quantile, summarize } from "./perf.js";

const times = (n, gap, start = 0) => Array.from({ length: n }, (_, i) => start + i * gap);

describe("quantile", () => {
  it("picks from the sorted list and handles empty", () => {
    expect(quantile([5, 1, 3], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(10);
    expect(quantile([], 0.5)).toBe(0);
  });
});

describe("keep", () => {
  it("keeps only the latest samples", () => {
    let list = [];
    for (let i = 0; i < 200; i++) list = keep(list, i);
    expect(list.length).toBe(120);
    expect(list[0]).toBe(80);
  });
});

describe("summarize", () => {
  it("reads 60 fps from 16.7 ms frames, and the draw time apart from it", () => {
    const s = summarize([4, 4, 5], times(30, 16.7));
    expect(s).toMatchObject({ draws: 3, fps: 60, drawMs: 4, slowShare: 0 });
  });
  it("does not count time the map sat still", () => {
    expect(summarize([4], [...times(20, 16.7), ...times(20, 16.7, 5000)]).fps).toBe(60);
  });
  it("counts frames under 30 fps as slow", () => {
    const s = summarize([20], [...times(11, 16.7), ...times(10, 50, 1000)]); // 10 quick gaps, a pause, 9 slow gaps
    expect(s.slowShare).toBeCloseTo(9 / 19);
    expect(s.fps).toBe(Math.round((1000 * 19) / (10 * 16.7 + 9 * 50))); // stutter pulls the rate down
  });
  it("does not call a steady 30 fps slow", () => {
    expect(summarize([4], times(30, 1000 / 30)).slowShare).toBe(0);
  });
  it("is empty before any draw", () => {
    expect(summarize([], [])).toMatchObject({ draws: 0, fps: 0, slowShare: 0 });
  });
});

describe("perfLine", () => {
  it("asks for a drag first, then shows the numbers in plain words", () => {
    expect(perfLine(summarize([], []), "low")).toBe("low tier. Drag the map to measure.");
    expect(perfLine(summarize([4], times(30, 16.7)), "low")).toBe("low tier · 60 fps · 0% slow frames · draw 4.0 ms, slowest tenth 4.0 ms");
  });
});
