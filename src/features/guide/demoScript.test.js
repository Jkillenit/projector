import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import resources from "../../demo/resources.json";
import organizations from "../../demo/organizations.json";
import students from "../../demo/students.json";
import courses from "../../demo/courses.json";
import enrollments from "../../demo/enrollments.json";
import { tutoringCourses, tutoringFor } from "../resources/tutoring.js";
import { EXAMPLE_QUESTIONS } from "./copy.js";
import { SENSITIVE_GROUPS, match, orgsAsResources } from "./matcher.js";

// #212: every Ask line in DEMO.md gets the answer the script promises, the same way the Ask screen asks it.
const DEMO = readFileSync(fileURLToPath(new URL("../../../DEMO.md", import.meta.url)), "utf8");

/** Rows of the "Ask lines" table: { line, main, kind, first }. */
function askLines(md) {
  const section = md.split(/^## Ask lines$/m)[1]?.split(/^## /m)[0] || "";
  return section
    .split(/\r?\n/)
    .filter((l) => /^\|/.test(l) && !/^\|\s*(Line|---)/.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .map(([raw, kind, first]) => ({ line: raw.replace(/\s*\(\*\*main\*\*\)$/, ""), main: /\(\*\*main\*\*\)$/.test(raw), kind, first }));
}

const maya = students.find((s) => s.id === "maya");
// Maya's course codes, as the sidebar and the Ask screen get them. Bama Bound is an organization, not a class.
const codes = enrollments
  .filter((e) => e.student_id === "maya")
  .map((e) => courses.find((c) => c.id === e.course_id))
  .filter((c) => c && /^[A-Z]{2,5} \d{3}/.test(c.code))
  .map((c) => c.code);
const pool = [...resources, ...orgsAsResources(organizations)];
const ask = (line) => match(line, maya, pool, { courses: codes, tutoringFor, tutoringCourses: tutoringCourses() });

/** What the first card shows, in the words DEMO.md uses. */
function firstCard(out) {
  if (out.kind === "course") return out.course;
  if (out.kind === "which_course") return out.choices.join(", ");
  if (out.kind === "course_none") return out.catalog[0];
  if (out.kind === "crisis") return "988";
  if (out.kind === "not_sure") return "directory";
  return out.items[0]?.resource.id;
}

const rows = askLines(DEMO);

describe("DEMO.md Ask lines", () => {
  it("has a table to check, with one main line", () => {
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.filter((r) => r.main)).toHaveLength(1);
    expect(codes).toEqual(["MATH 126", "ENGL 101", "CH 101", "PSY 101"]);
  });

  it.each(rows.map((r) => [r.line, r]))("%s", (_, row) => {
    const out = ask(row.line);
    expect(out.kind).toBe(row.kind);
    expect(firstCard(out)).toBe(row.first);
    expect(ask(row.line)).toEqual(out); // the same answer every time
  });

  it("the main line never trips a sensitive rule, including counseling", () => {
    const main = rows.find((r) => r.main).line;
    expect(SENSITIVE_GROUPS.some((g) => g.pattern.test(main.toLowerCase()))).toBe(false);
    expect(ask(main).kind).not.toBe("sensitive");
  });
});

describe("suggested prompts", () => {
  it("include the main demo line", () => {
    expect(EXAMPLE_QUESTIONS).toContain(rows.find((r) => r.main).line);
  });

  it("are all in the demo script, so every chip has a known answer", () => {
    const lines = rows.map((r) => r.line);
    for (const q of EXAMPLE_QUESTIONS) expect(lines).toContain(q);
  });
});
