import { describe, expect, it } from "vitest";
import campus from "./campus.json";
import { ORIGIN, buildingLook, directionLinks, findBuilding, heightOf, natureLayer, placeParts, project, roomOf, simplify, toPath, unproject } from "./campusMap.js";

const places = [...campus.buildings, ...campus.areas];
const nameOf = (where) => findBuilding(where, places)?.name ?? null;

describe("campus map math", () => {
  it("projects to meters from the origin, east is +x and north is -y", () => {
    expect(project(ORIGIN.lat, ORIGIN.lon)).toEqual([0, 0]);
    const [x, y] = project(ORIGIN.lat + 0.001, ORIGIN.lon + 0.001);
    expect(y).toBeCloseTo(-110.6, 0);
    expect(x).toBeCloseTo(93.2, 0);
  });

  it("turns map points back into latitude and longitude", () => {
    const here = { lat: 33.211057, lon: -87.54923 };
    const back = unproject(project(here.lat, here.lon));
    expect(back.lat).toBeCloseTo(here.lat, 5);
    expect(back.lon).toBeCloseTo(here.lon, 5);
  });

  it("builds direction links that carry only the destination", () => {
    const links = directionLinks({ lat: 33.2141, lon: -87.5458 }, "Bidgood Hall");
    expect(links.map((l) => l.id)).toEqual(["waze", "google", "apple"]);
    expect(links[0].url).toBe("https://waze.com/ul?ll=33.2141,-87.5458&navigate=yes");
    expect(links[1].url).toBe("https://www.google.com/maps/dir/?api=1&destination=33.2141,-87.5458");
    expect(links[2].url).toBe("https://maps.apple.com/?daddr=33.2141,-87.5458&q=Bidgood%20Hall");
    expect(links.every((l) => l.url.startsWith("https://"))).toBe(true);
  });

  it("simplifies outlines, closed ones too, and writes SVG paths", () => {
    expect(simplify([[0, 0], [5, 0.2], [10, 0]], 1)).toEqual([[0, 0], [10, 0]]);
    const square = [[0, 0], [5, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    expect(simplify(square, 1)).toEqual([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
    expect(toPath([[0, 0], [10.4, 0], [10, 9.6]], true)).toBe("M0 0L10 0L10 10Z");
  });

  it("guesses a building's height in meters from its OSM tags", () => {
    expect(heightOf({ height: "24.5" })).toBe(25);
    expect(heightOf({ height: "24 m", "building:levels": "2" })).toBe(24);
    expect(heightOf({ height: "40 ft" })).toBe(12);
    expect(heightOf({ "building:levels": "4" })).toBe(14);
    expect(heightOf({})).toBe(11);
    expect(heightOf({ height: "tall", "building:levels": "3" })).toBe(11);
    expect(heightOf({ height: "-5", "building:levels": "0" })).toBe(11);
    expect(heightOf({ height: "900" })).toBe(11);
  });

  it("keeps a whole-meter height on every named building", () => {
    expect(campus.buildings.every((b) => Number.isInteger(b.h) && b.h > 0)).toBe(true);
  });

  it("sorts OSM tags into nature layers", () => {
    expect(natureLayer({ natural: "tree" })).toBe("trees");
    expect(natureLayer({ natural: "tree_row" })).toBe("treeRows");
    expect(natureLayer({ waterway: "river" })).toBe("river");
    expect(natureLayer({ natural: "water", water: "river" })).toBe("water");
    expect(natureLayer({ waterway: "riverbank" })).toBe("water");
    expect(natureLayer({ landuse: "forest" })).toBe("wood");
    expect(natureLayer({ natural: "scrub" })).toBe("wood");
    expect(natureLayer({ landuse: "meadow" })).toBe("grass");
    expect(natureLayer({ amenity: "parking" })).toBe("parking");
    expect(natureLayer({ leisure: "pitch", name: "Sewell-Thomas" })).toBe("pitch");
    expect(natureLayer({ highway: "footway" })).toBe("paths");
    expect(natureLayer({ highway: "steps" })).toBe("paths");
    expect(natureLayer({ highway: "service" })).toBe("roads");
    expect(natureLayer({ highway: "primary" })).toBe("roads");
    // A parking deck is a building, not a lot.
    expect(natureLayer({ amenity: "parking", building: "parking" })).toBe(null);
    expect(natureLayer({ leisure: "stadium" })).toBe(null);
    expect(natureLayer({})).toBe(null);
  });

  it("keeps a building's colors and roof from OSM, or nothing", () => {
    expect(buildingLook({ "building:colour": "Red", "roof:colour": "#AABBCC", "roof:shape": "gabled", "building:material": "brick" })).toEqual({
      colour: "red",
      roof: "#aabbcc",
      roofShape: "gabled",
      material: "brick",
    });
    expect(buildingLook({ "roof:shape": " flat " })).toEqual({ roofShape: "flat" });
    expect(buildingLook({ building: "yes" })).toBe(null);
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

describe("roomOf", () => {
  it("finds the room in a class place", () => {
    expect(roomOf("Bidgood Hall 116")).toBe("116");
    expect(roomOf("Room 1093, Shelby Hall")).toBe("1093");
    expect(roomOf("Lloyd 38A")).toBe("38A");
    expect(roomOf("Rm. 205 Lloyd Hall")).toBe("205");
  });
  it("gives null when there is no room", () => {
    for (const where of ["Online", "TBA", "Zoom 1234", "Shelby Hall", "Bruno Business Library, 1st Floor Lobby", "", null]) expect(roomOf(where)).toBeNull();
  });
});
