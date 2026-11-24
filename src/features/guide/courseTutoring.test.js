import { describe, expect, it } from "vitest";
import resources from "../../demo/resources.json";
import students from "../../demo/students.json";
import { courseRefs, coursesAsked } from "./courseTutoring.js";
import { match } from "./matcher.js";

const maya = students.find((s) => s.id === "maya");
const MINE = ["MATH 126", "ENGL 101", "CH 101", "PSY 101", "EN 126"];
// A stand-in for resources/tutoring.js: only MATH 126 and CH 101 have course tutoring here.
const SESSIONS = { "MATH 126": [{ id: "m1", course: "MATH 126", title: "Calc II drop-in", mapHref: "#/map?place=w1", locationNote: null }], "CH 101": [{ id: "c1", course: "CH 101", title: "Chem drop-in" }] };
const tutoringFor = (code) => SESSIONS[code] || [];
const ask = (text, courses = MINE) => match(text, maya, resources, { courses, tutoringFor, tutoringCourses: Object.keys(SESSIONS) });

describe("courseRefs", () => {
  it("finds codes and bare course numbers", () => {
    expect(courseRefs("I'm failing 126")).toEqual([{ number: "126" }]);
    expect(courseRefs("help with math126 and CH 101")).toEqual([{ subject: "MATH", number: "126" }, { subject: "CH", number: "101" }]);
  });

  it("ignores numbers that are not course numbers", () => {
    expect(courseRefs("I owe 2000 dollars")).toEqual([]);
    expect(courseRefs("room 12")).toEqual([]);
    expect(courseRefs("")).toEqual([]);
  });
});

describe("coursesAsked", () => {
  it("matches a bare number to every class with that number, and a code to just that class", () => {
    expect(coursesAsked("126", MINE)).toEqual(["MATH 126", "EN 126"]);
    expect(coursesAsked("math 126", MINE)).toEqual(["MATH 126"]);
    expect(coursesAsked("221", MINE)).toEqual([]);
  });
});

describe("course tutoring in the guide", () => {
  it("one match: that class's tutoring, ready to sign up and find on the map", () => {
    const out = ask("I'm failing MATH 126");
    expect(out.kind).toBe("course");
    expect(out.course).toBe("MATH 126");
    expect(out.sessions.map((s) => s.id)).toEqual(["m1"]);
    expect(out.items.length).toBeGreaterThan(0); // general tutoring as a second option
  });

  it("one match with no class tutoring: says so and offers general tutoring", () => {
    const out = ask("I need a tutor for PSY 101");
    expect(out.kind).toBe("course");
    expect(out.sessions).toEqual([]);
    expect(out.items.map((i) => i.resource.category)).toContain("tutoring");
  });

  it("several matches: asks which one", () => {
    const out = ask("I'm failing 126");
    expect(out.kind).toBe("which_course");
    expect(out.choices).toEqual(["MATH 126", "EN 126"]);
    expect(out.message).toBe("Which one?");
  });

  it("no match: the tutoring catalog, then general tutoring", () => {
    const out = ask("I'm failing 221");
    expect(out.kind).toBe("course_none");
    expect(out.catalog).toEqual(["MATH 126", "CH 101"]);
    expect(out.items.map((i) => i.resource.category)).toContain("tutoring");
  });

  it("leaves questions without a class, or without asking for help, to the usual matching", () => {
    expect(ask("I'm failing Calc 2").kind).toBe("matched");
    expect(ask("where is my 126 class room").kind).not.toMatch(/course/);
    expect(ask("I'm failing 126", []).kind).toBe("course_none");
  });

  it("still runs the crisis and sensitive checks first", () => {
    expect(ask("I'm failing 126 and want to kill myself").kind).toBe("crisis");
    expect(ask("I need extra time on my 126 exam").kind).toBe("sensitive");
  });

  it("works as before when no courses are passed", () => {
    expect(match("I'm failing 126", maya, resources).kind).not.toMatch(/course/);
  });
});
