import { describe, expect, it } from "vitest";
import resources from "../../demo/resources.json";
import { fuzzyFilter } from "../../lib/fuzzy.js";
import { checkedLabel, filterOf, searchText, signInNeeded, sourceName, stepsOf } from "./resourceView.js";

const find = (q) => fuzzyFilter(resources, q, searchText).map((r) => r.id);

describe("resource view", () => {
  it("shows placeholders instead of made-up facts", () => {
    expect(checkedLabel({ last_checked: "TODO verify" })).toBe("Checked [date]");
    expect(checkedLabel({ last_checked: "2026-10-28" })).toBe("Checked Oct 28");
    expect(sourceName({ source_url: "TODO verify" })).toBe("[source]");
    expect(sourceName({ source_url: "https://www.ua.edu/x" })).toBe("ua.edu");
  });

  it("reads sign in and steps from the data", () => {
    const bb = resources.find((r) => r.id === "blackboard");
    expect(signInNeeded(bb)).toBe(true);
    expect(stepsOf(bb)).toHaveLength(3);
    expect(filterOf({ category: "tutoring" })).toBe("study");
  });

  it("finds tutoring from 'tutor' and the writing center from a typo", () => {
    expect(find("tutor")).toContain("ingenuity-lab-tutoring");
    expect(find("writting")[0]).toBe("writing-center");
  });
});
