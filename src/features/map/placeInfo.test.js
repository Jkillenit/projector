import { describe, expect, it } from "vitest";
import campus from "./campus.json";
import { resourcesAt, whenAt } from "./placeInfo.js";

const places = [...campus.buildings, ...campus.areas];
const byName = (name) => places.find((p) => p.name === name);

describe("place panel info", () => {
  it("lists resources whose checked location is this building, and skips unchecked ones", () => {
    const resources = [
      { id: "writing", name: "Writing Center", location: "Lloyd Hall, Room 322" },
      { id: "todo", name: "Somewhere", location: "TODO verify" },
      { id: "none", name: "Online thing", location: "Online" },
      { id: "other", name: "Library help", location: "Amelia Gayle Gorgas Library" },
    ];
    expect(resourcesAt(byName("Lloyd Hall"), resources, places).map((r) => r.id)).toEqual(["writing"]);
    expect(resourcesAt(byName("Amelia Gayle Gorgas Library"), resources, places).map((r) => r.id)).toEqual(["other"]);
    expect(resourcesAt(null, resources, places)).toEqual([]);
  });

  it("writes the time short for today and with the day for this week", () => {
    const iso = new Date(2026, 10, 9, 18, 0).toISOString(); // Mon Nov 9, 6 PM local
    expect(whenAt(iso, "today")).toBe("6:00 PM");
    expect(whenAt(iso, "week")).toBe("Mon 6:00 PM");
  });
});
