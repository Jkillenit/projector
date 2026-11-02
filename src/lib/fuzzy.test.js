import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy.js";

describe("fuzzy", () => {
  it("matches prefixes and inner words", () => {
    expect(fuzzyScore("tutor", "Ingenuity Lab tutoring")).toBeGreaterThan(0);
    expect(fuzzyScore("lab", "Ingenuity Lab tutoring")).toBeGreaterThan(0);
  });
  it("tolerates one typo and wrong word order", () => {
    expect(fuzzyScore("tutorng", "Ingenuity Lab tutoring")).toBeGreaterThan(0);
    expect(fuzzyScore("tutoring ingenuity", "Ingenuity Lab tutoring")).toBeGreaterThan(0);
  });
  it("rejects words that are not there", () => {
    expect(fuzzyScore("zebra", "Ingenuity Lab tutoring")).toBe(0);
    expect(fuzzyScore("tutoring zebra", "Ingenuity Lab tutoring")).toBe(0);
  });
  it("ranks prefix hits above inner hits and keeps everything for an empty query", () => {
    const items = ["pretutoring", "tutoring"];
    expect(fuzzyFilter(items, "tutor", (x) => x)[0]).toBe("tutoring");
    expect(fuzzyFilter(items, "", (x) => x)).toHaveLength(2);
  });
});
