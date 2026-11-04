import { describe, expect, it } from "vitest";
import { fromSource, interestsOf } from "./sourceClubs.js";
import { rankClubs } from "./clubMatch.js";

// Trimmed copies of real rows from The SOURCE's public list (fields we read, plus the HTML one we skip).
const rows = [
  {
    Id: "435373",
    Name: " THE ARTIFICIAL INTELLIGENCE & FINANCE SOCIETY",
    WebsiteKey: "aifs",
    Description: "<p>The Artificial Intelligence &amp; Finance Society ...</p>",
    Summary: "Members learn about financial markets programming data analysis and AI while working together on real world FinTech projects. ",
    CategoryNames: ["Academic", "Professional or Law"],
    Status: "Active",
    Visibility: "Public",
  },
  { Id: "427488", Name: "3D Design Club", WebsiteKey: "3ddesignclub", Summary: "Grow your skills in CAD software.", CategoryNames: ["Academic"], Status: "Active", Visibility: "Public" },
  { Id: "1", Name: "Old Club", WebsiteKey: "old", Status: "Inactive", Visibility: "Public" },
  { Id: "2", Name: "Hidden Club", WebsiteKey: "hidden", Status: "Active", Visibility: "Private" },
];

describe("clubs from The SOURCE", () => {
  it("keeps active public clubs, trims names, links to the club page, and has no meeting time", () => {
    const clubs = fromSource(rows);
    expect(clubs.map((c) => c.name)).toEqual(["THE ARTIFICIAL INTELLIGENCE & FINANCE SOCIETY", "3D Design Club"]);
    expect(clubs[0]).toMatchObject({ id: "source-435373", url: "https://ua.campuslabs.com/engage/organization/aifs", meets: null, categories: ["Academic", "Professional or Law"] });
    expect(fromSource(null)).toEqual([]);
  });

  it("matches interest tags on whole words only", () => {
    const [aifs, design] = fromSource(rows);
    expect(aifs.interests).toEqual(["coding", "finance club"]);
    expect(design.interests).toEqual(["coding", "art"]); // "CAD software" counts as coding
    expect(interestsOf("Artificial party department")).toEqual([]);
    expect(interestsOf("Arts and Crafts")).toEqual(["art"]);
  });

  it("ranks with the existing club ranking, and a missing meeting time never counts as fitting", () => {
    const ranked = rankClubs(fromSource(rows), { interests: ["finance club"], free_times: [{ day: "Tue", from: "08:00", to: "20:00" }] });
    expect(ranked[0]).toMatchObject({ shared: ["finance club"], fits: false });
  });
});
