import { describe, expect, it } from "vitest";
import campus from "./campus.json";
import resources from "../../demo/resources.json";
import organizations from "../../demo/organizations.json";
import { LOCATIONS, locationOf, mapHref } from "./locations.js";

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
