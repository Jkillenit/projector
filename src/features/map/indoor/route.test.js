import { describe, expect, it } from "vitest";
import { buildGraph, route } from "./route.js";
import demoHall from "../../../demo/indoor/demo-hall.indoor.json";

const graph = buildGraph(demoHall);
const kinds = (r) => r.points.filter((p) => p.link).map((p) => p.link.kind);

describe("buildGraph", () => {
  it("joins every door, entrance and link to the walk", () => {
    expect(graph.rooms.size).toBe(10);
    expect(graph.entrances.map((e) => e.entrance.id)).toEqual(["north", "west"]);
    // The north hall ends on the main hall between its corners; it must still join it.
    expect(route(graph, "north", "101").meters).toBeCloseTo(12 + 11 + 2);
  });

  it("merges points within 0.5 m", () => {
    const d = structuredClone(demoHall);
    d.floors[0].walk.push([[24.3, 12.2], [24.3, 30]]);
    const g = buildGraph(d);
    expect(g.nodes.filter((n) => n.floor === 1 && Math.hypot(n.at[0] - 24, n.at[1] - 12) <= 0.5)).toHaveLength(1);
  });
});

describe("route on Demo Hall", () => {
  it("walks to a room on the same floor from the main door", () => {
    const r = route(graph, undefined, "104");
    expect(r.from.id).toBe("north");
    expect(r.floors).toEqual([1]);
    expect(r.points[0].at).toEqual([24, 0]);
    expect(r.points.at(-1).at).toEqual([25, 14]);
    expect(r.meters).toBeCloseTo(12 + 1 + 2);
  });

  it("lets the student pick another door", () => {
    const r = route(graph, "west", "101");
    expect(r.from.id).toBe("west");
    expect(r.meters).toBeCloseTo(13 + 2);
  });

  it("takes the stairs to another floor", () => {
    const r = route(graph, "north", "216");
    expect(r.floors).toEqual([1, 2]);
    expect(kinds(r)).toEqual(["stairs", "stairs"]);
    expect(r.meters).toBeCloseTo(12 + 20 + 21 + 2);
  });

  it("takes the elevator when step free, even though stairs cost less", () => {
    const r = route(graph, undefined, "216", { stepFree: true });
    expect(r.floors).toEqual([1, 2]);
    expect(kinds(r)).toEqual(["elevator", "elevator"]);
    expect(r.meters).toBeCloseTo(12 + 20 + 19 + 2);
  });

  it("says why there is no route", () => {
    expect(route(graph, "north", "999").reason).toBe("We can't find room 999 in Demo Hall");
    expect(route(graph, "back", "101").reason).toBe("We don't know that door");
    expect(route(graph, "west", "101", { stepFree: true }).reason).toBe("West door is not step free");

    const d = structuredClone(demoHall);
    for (const f of d.floors) f.links = f.links.filter((l) => l.kind !== "elevator");
    const noLift = buildGraph(d);
    expect(route(noLift, undefined, "216", { stepFree: true })).toEqual({ points: [], reason: "No step free way to Room 216" });
    expect(route(noLift, undefined, "216").floors).toEqual([1, 2]);
  });

  it("has no step free way in when no door is step free", () => {
    const d = structuredClone(demoHall);
    d.floors[0].entrances[0].stepFree = false;
    expect(route(buildGraph(d), undefined, "101", { stepFree: true }).reason).toBe("No step free way to Room 101");
  });
});
