import { describe, expect, it } from "vitest";
import { parseRoute, routeHref } from "./useRoute.js";

describe("routes", () => {
  it("reads name, parts and query", () => {
    expect(parseRoute("#/course/abc/grades?item=x")).toEqual({ name: "course", parts: ["abc", "grades"], query: { item: "x" } });
  });

  it("falls back to home", () => {
    expect(parseRoute("").name).toBe("home");
    expect(parseRoute("#/").name).toBe("home");
  });

  it("round-trips through routeHref", () => {
    const href = routeHref("course", ["a b", "grades"], { item: "1", skip: null });
    expect(href).toBe("#/course/a%20b/grades?item=1");
    expect(parseRoute(href).parts).toEqual(["a b", "grades"]);
  });
});
