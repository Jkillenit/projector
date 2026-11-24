import { describe, expect, it } from "vitest";
import campus from "./campus.json";
import resources from "../../demo/resources.json";
import organizations from "../../demo/organizations.json";
import { LOCATIONS, locationOf, mapHref, mapLink } from "./locations.js";

const places = [...campus.buildings, ...campus.areas];

describe("location registry", () => {
  it("points every row at a real place in campus.json", () => {
    for (const [id, loc] of Object.entries(LOCATIONS)) {
      expect(places.some((p) => p.id === loc.placeId), id).toBe(true);
    }
  });

  it("gives every row a label, a room (or null) and a verified flag", () => {
    for (const loc of Object.values(LOCATIONS)) {
      expect(loc.label).toBeTruthy();
      expect(loc.room === null || typeof loc.room === "string").toBe(true);
      expect(typeof loc.verified).toBe("boolean");
    }
  });

  it("only uses ids that are in the registry, for resources and clubs", () => {
    for (const row of [...resources, ...organizations].filter((r) => r.locationId)) {
      expect(LOCATIONS[row.locationId], row.id).toBeDefined();
    }
  });

  it("looks a row up by id, and returns null for anything else", () => {
    expect(locationOf("gorgas-library").placeId).toBe("w130596789");
    expect(locationOf("nowhere")).toBeNull();
    expect(locationOf(undefined)).toBeNull();
  });
});

describe("mapHref", () => {
  it("links a registry id to its pin", () => {
    expect(mapHref("gorgas-library")).toBe("#/map?place=w130596789");
  });

  it("falls back to a search for place text it does not know", () => {
    expect(mapHref("Bidgood Hall 116")).toBe("#/map?q=Bidgood+Hall+116");
  });

  it("returns null when there is nowhere to walk to", () => {
    for (const where of [undefined, null, "", "  ", "Online", "Zoom", "TODO verify"]) {
      expect(mapHref(where), String(where)).toBeNull();
    }
  });
});

describe("mapLink", () => {
  it("links a registry id to its pin, and says when nobody has checked it", () => {
    expect(mapLink({ locationId: "lloyd-hall" })).toEqual({ href: "#/map?place=w233695042", note: "Location not checked yet" });
  });

  it("drops the note once a row is checked", () => {
    LOCATIONS["test-checked"] = { placeId: "w233695042", label: "Lloyd Hall", room: "322", verified: true };
    try {
      expect(mapLink({ locationId: "test-checked" })).toEqual({ href: "#/map?place=w233695042", note: null });
    } finally {
      delete LOCATIONS["test-checked"];
    }
  });

  it("prefers the registry id over place text", () => {
    expect(mapLink({ locationId: "lloyd-hall", where: "Bidgood Hall" }).href).toBe("#/map?place=w233695042");
  });

  it("searches the map for place text", () => {
    expect(mapLink({ where: "Bidgood Hall 116" })).toEqual({ href: "#/map?q=Bidgood+Hall+116", note: null });
  });

  it("says Online, with no link, for online places", () => {
    expect(mapLink({ where: "Zoom" })).toEqual({ href: null, note: "Online" });
    expect(mapLink({ where: "Ferguson Center", online: true })).toEqual({ href: null, note: "Online" });
  });

  it("returns null when there is no place at all", () => {
    for (const thing of [undefined, {}, { where: "" }, { where: "TODO verify" }, { locationId: "nowhere" }]) {
      expect(mapLink(thing)).toBeNull();
    }
  });
});
