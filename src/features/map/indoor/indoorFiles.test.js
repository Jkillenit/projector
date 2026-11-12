import { describe, expect, it } from "vitest";
import demoHall from "../../../demo/indoor/demo-hall.indoor.json";
import { sortIndoor } from "./indoorFiles.js";

describe("sorting indoor files (#63)", () => {
  it("keeps files that pass the checker and skips the rest with plain reasons", () => {
    const out = sortIndoor([
      { file: "demo-hall.indoor.json", data: demoHall },
      { file: "broken.indoor.json", error: "This file could not be read. Is it saved as JSON?" },
      { file: "empty.indoor.json", data: { name: "Empty Hall" } },
      { file: "copy.indoor.json", data: demoHall },
      { file: "list.indoor.json", data: [] },
    ]);
    expect(out.buildings).toEqual([demoHall]);
    expect(out.skipped.map((s) => s.file)).toEqual(["broken.indoor.json", "empty.indoor.json", "copy.indoor.json", "list.indoor.json"]);
    expect(out.skipped[0].problems).toEqual(["This file could not be read. Is it saved as JSON?"]);
    expect(out.skipped[1].problems).toContain("The building has no floors");
    expect(out.skipped[2].problems).toEqual(["Another file already has Demo Hall"]);
    expect(out.skipped[3].problems).toEqual(["This is not a building file"]);
  });

  it("is empty for nothing", () => {
    expect(sortIndoor(undefined)).toEqual({ buildings: [], skipped: [] });
  });
});
