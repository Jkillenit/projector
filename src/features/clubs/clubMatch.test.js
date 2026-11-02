import { describe, expect, it } from "vitest";
import organizations from "../../demo/organizations.json";
import students from "../../demo/students.json";
import { fitsFreeTime, meetingText, rankClubs, sharedInterests } from "./clubMatch.js";

const maya = students.find((s) => s.id === "maya");
const devon = students.find((s) => s.id === "devon");
const club = (id) => organizations.find((o) => o.id === id);

describe("fitsFreeTime", () => {
  it("fits when the meeting sits inside a free window", () => {
    expect(fitsFreeTime(club("midnight-coders"), maya)).toBe(true); // Tue 15:00-16:30, Maya free Tue 12-17
    expect(fitsFreeTime(club("pantry-helpers"), maya)).toBe(true); // Thu 13:00-15:00
  });
  it("does not fit on another day or when it runs past the window", () => {
    expect(fitsFreeTime(club("board-game-guild"), maya)).toBe(false);
    expect(fitsFreeTime({ meets: { day: "Tue", start: "16:00", end: "18:00" } }, maya)).toBe(false);
  });
  it("respects a student who works nights", () => {
    expect(fitsFreeTime(club("open-mic-society"), devon)).toBe(false);
    expect(fitsFreeTime(club("iron-and-ideas"), devon)).toBe(true); // Sat 11-13 is inside Sat 10-18
  });
});

describe("rankClubs", () => {
  it("puts the most shared interests first", () => {
    const ranked = rankClubs(organizations, maya);
    expect(ranked[0].club.id).toBe("code-for-good"); // coding + volunteering
    expect(ranked[0].shared).toEqual(["coding", "volunteering"]);
  });
  it("filters by an interest and keeps clubs for a student with none", () => {
    expect(rankClubs(organizations, maya, { interest: "art" }).map((r) => r.club.id)).toEqual(["sketch-and-sip"]);
    expect(rankClubs(organizations, { interests: [], free_times: [] })).toHaveLength(organizations.length);
  });
  it("describes meetings in plain words", () => {
    expect(meetingText(club("midnight-coders"))).toBe("Tue 15:00 to 16:30");
    expect(sharedInterests(club("midnight-coders"), devon)).toEqual([]);
  });
});
