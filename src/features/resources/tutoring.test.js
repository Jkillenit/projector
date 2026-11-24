import { describe, expect, it } from "vitest";
import campus from "../map/campus.json";
import seed from "../../demo/tutoring.json";
import { courseKey, placeTutoring, tutoringFor } from "./tutoring.js";

const places = [...campus.buildings, ...campus.areas];
const session = (over) => ({ id: "s", course: "MATH 126", title: "Drop-in", where: "Lloyd Hall 111", days: [1], start: "18:00", end: "19:00", signUp: [], demo: true, ...over });

describe("courseKey", () => {
  it("reads a course code the same however it is written", () => {
    for (const code of ["MATH 126", "math 126", "Math126", "MATH-126", " math  126 "]) expect(courseKey(code)).toBe("MATH 126");
  });

  it("returns null for anything that is not a code", () => {
    for (const code of [undefined, null, "", "126", "MATH", "calculus"]) expect(courseKey(code)).toBeNull();
  });
});

describe("placeTutoring", () => {
  it("puts a session on its building's pin, with the room", () => {
    const [s] = placeTutoring([session()], places);
    expect(s.place.name).toBe("Lloyd Hall");
    expect(s.room).toBe("111");
    expect(s.mapHref).toBe(`#/map?place=${s.place.id}`);
    expect(s.locationNote).toBeNull();
  });

  it("never guesses: a place it cannot match gets no pin and says so", () => {
    const [s] = placeTutoring([session({ where: "Learning Annex B" })], places);
    expect(s.place).toBeNull();
    expect(s.mapHref).toBeNull();
    expect(s.locationNote).toBe("Location not checked yet");
  });

  it("treats online sessions as online, with no pin", () => {
    const [s] = placeTutoring([session({ where: "Online (Zoom)" })], places);
    expect(s.place).toBeNull();
    expect(s.mapHref).toBeNull();
    expect(s.locationNote).toBe("Online");
  });
});

describe("tutoringFor", () => {
  const sessions = [session({ id: "a" }), session({ id: "b", course: "CH 101" }), session({ id: "c", course: "math 126", where: "Online" })];

  it("returns only that course's sessions, however the code is written", () => {
    expect(tutoringFor("Math126", { sessions, places }).map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("returns nothing for a course with no tutoring, or no code", () => {
    expect(tutoringFor("MKT 300", { sessions, places })).toEqual([]);
    expect(tutoringFor("", { sessions, places })).toEqual([]);
  });
});

describe("the demo tutoring seed", () => {
  it("is marked demo and names no tutors", () => {
    for (const s of seed) {
      expect(s.demo, s.id).toBe(true);
      expect(s).not.toHaveProperty("tutor");
    }
  });

  it("puts every in-person session on a real building", () => {
    for (const s of placeTutoring(seed, places)) {
      if (s.locationNote !== "Online") expect(s.place, s.where).not.toBeNull();
    }
  });

  it("covers MATH 126, the course in the demo script", () => {
    expect(tutoringFor("MATH 126", { sessions: seed, places }).length).toBeGreaterThan(0);
  });
});
