import { describe, expect, it } from "vitest";
import campus from "./campus.json";
import { ORIGIN, findBuilding, placeParts, project, simplify, toPath } from "./campusMap.js";

const places = [...campus.buildings, ...campus.areas];
const nameOf = (where) => findBuilding(where, places)?.name ?? null;

describe("campus map math", () => {
  it("projects to meters from the origin, east is +x and north is -y", () => {
    expect(project(ORIGIN.lat, ORIGIN.lon)).toEqual([0, 0]);
    const [x, y] = project(ORIGIN.lat + 0.001, ORIGIN.lon + 0.001);
    expect(y).toBeCloseTo(-110.6, 0);
    expect(x).toBeCloseTo(93.2, 0);
  });

  it("simplifies outlines, closed ones too, and writes SVG paths", () => {
    expect(simplify([[0, 0], [5, 0.2], [10, 0]], 1)).toEqual([[0, 0], [10, 0]]);
    const square = [[0, 0], [5, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    expect(simplify(square, 1)).toEqual([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
    expect(toPath([[0, 0], [10.4, 0], [10, 9.6]], true)).toBe("M0 0L10 0L10 10Z");
  });
});

describe("finding a building from a place", () => {
  it("drops rooms and floors from each part of the place", () => {
    expect(placeParts("Bidgood Hall 116")).toEqual(["bidgood hall"]);
    expect(placeParts("Room 1093, Shelby Hall")).toEqual(["shelby hall"]);
    expect(placeParts("Bruno Business Library, 1st Floor Lobby")).toEqual(["bruno business library"]);
  });

  it("matches real UA buildings the way syllabi and event pages write them", () => {
    expect(nameOf("Bidgood Hall 116")).toBe("Bidgood Hall");
    expect(nameOf("Bidgood 116")).toBe("Bidgood Hall");
    expect(nameOf("Room 1093, Shelby Hall")).toBe("Shelby Hall");
    expect(nameOf("Reese Phifer Hall")).toBe("Reese Phifer Hall");
    expect(nameOf("Quad ")).toBe("The Quad");
    expect(nameOf("Bryant Denny Stadium")).toBe("Bryant-Denny Stadium");
  });

  it("knows the names event pages use for the Student Center and the Quad", () => {
    for (const where of ["UA Student Center, 3104", "UASC Room 3115", "UASC Lawn", "UA Student Center Ballroom", "The Ferg"]) {
      expect(nameOf(where)).toBe("University of Alabama Student Center");
    }
    expect(nameOf("The University of Alabama Quad")).toBe("The Quad");
    expect(nameOf("Outside of BB Comer (Near Stadium Dr)")).toBe("B.B. Comer Hall");
  });

  it("never pins online or unknown places", () => {
    expect(nameOf("Online")).toBeNull();
    expect(nameOf("Zoom (link on Blackboard)")).toBeNull();
    expect(nameOf("TBA")).toBeNull();
    expect(nameOf("")).toBeNull();
    expect(nameOf("Perdido Beach Resort")).toBeNull();
  });

  it("keeps the OpenStreetMap credit in the data", () => {
    expect(campus.credit).toContain("OpenStreetMap");
    expect(campus.buildings.length).toBeGreaterThan(250);
  });
});
