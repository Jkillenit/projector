import { describe, expect, it } from "vitest";
import { TABS, activeTab } from "./tabs.js";

describe("phone tabs", () => {
  it("has five tabs in order", () => {
    expect(TABS.map((t) => t.key)).toEqual(["home", "calendar", "ask", "campus", "map"]);
    expect(TABS.map((t) => t.label)).toEqual(["Home", "Calendar", "Ask", "Campus", "Map"]);
    expect(TABS.map((t) => t.href)).toEqual(["#/home", "#/calendar", "#/ask", "#/campus", "#/map"]);
  });

  it.each([
    [{ name: "home", parts: [] }, "home"],
    [{ name: "calendar", parts: [] }, "calendar"],
    [{ name: "ask", parts: [] }, "ask"],
    [{ name: "campus", parts: [] }, "campus"],
    [{ name: "campus", parts: ["clubs"] }, "campus"],
    [{ name: "campus", parts: ["r", "x"] }, "campus"],
    [{ name: "events", parts: [] }, "campus"],
    [{ name: "map", parts: [] }, "map"],
    [{ name: "course", parts: ["abc", "grades"] }, null],
    [{ name: "settings", parts: [] }, null],
  ])("%o → %s", (route, key) => expect(activeTab(route)).toBe(key));
});
