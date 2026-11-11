import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { checkIssues, createOrder, parseIssues } from "./create-issues.mjs";

const SAMPLE = `# Backlog

Intro text that mentions an \`<!-- issue key=... -->\` line is not an issue.

<!-- issue key=X00 labels="map-3d,epic" milestone="One" -->
# Tracking

- [ ] #{{X01}} First

<!-- issue key=X01 labels="map-3d,must" milestone="One" -->
# First

Body with a link to #{{X00}}.
`;

describe("parseIssues", () => {
  it("reads key, labels, milestone, title and body", () => {
    const [epic, first] = parseIssues(SAMPLE);
    expect(epic).toMatchObject({ key: "X00", labels: ["map-3d", "epic"], milestone: "One", title: "Tracking" });
    expect(first.body).toBe("Body with a link to #{{X00}}.");
  });
});

describe("checkIssues", () => {
  it("passes a good backlog", () => {
    expect(checkIssues(parseIssues(SAMPLE))).toEqual([]);
  });
  it("finds broken links, unknown labels and repeated keys", () => {
    const bad = parseIssues(SAMPLE.replace("{{X00}}", "{{X09}}").replace("map-3d,must", "nope") + SAMPLE.slice(SAMPLE.indexOf("<!-- issue key=X01")));
    const problems = checkIssues(bad).join("\n");
    expect(problems).toMatch(/X09/);
    expect(problems).toMatch(/"nope"/);
    expect(problems).toMatch(/X01 is used twice/);
  });
});

describe("createOrder", () => {
  it("puts tracking issues last", () => {
    expect(createOrder(parseIssues(SAMPLE)).map((x) => x.key)).toEqual(["X01", "X00"]);
  });
});

describe("docs/issues/next.md", () => {
  it("has no problems", () => {
    const issues = parseIssues(readFileSync(new URL("../docs/issues/next.md", import.meta.url), "utf8"));
    expect(issues.length).toBeGreaterThan(30);
    expect(checkIssues(issues)).toEqual([]);
  });
});
