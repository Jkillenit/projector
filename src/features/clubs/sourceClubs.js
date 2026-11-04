/** Rows from The SOURCE's public club list (electron/sourceClubs.cjs) → the club shape rankClubs uses. */

export const SOURCE_ORG_URL = "https://ua.campuslabs.com/engage/organization/";
export const SOURCE_DIRECTORY_URL = "https://ua.campuslabs.com/engage/organizations";

// Words in a club's name, summary or categories that point to one of our interest tags (src/demo/interests.json).
const CUES = {
  intramurals: ["intramural", "sport", "league", "club sport"],
  coding: ["coding", "programming", "software", "computer", "hackathon", "developer", "cyber"],
  volunteering: ["volunteer", "service", "philanthropy", "community service"],
  "finance club": ["finance", "investing", "investment", "fintech", "trading"],
  lifting: ["lifting", "weightlifting", "powerlifting", "barbell", "strength"],
  music: ["music", "band", "choir", "a cappella", "orchestra", "musician"],
  art: ["art", "drawing", "painting", "design", "film", "photography"],
  outdoors: ["outdoor", "hiking", "climbing", "camping", "fishing", "nature"],
  gaming: ["gaming", "esports", "video game", "board game", "tabletop"],
  writing: ["writing", "writer", "poetry", "literary", "journalism"],
};
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole words only, plural allowed: "art" and "arts" match, "artificial" and "party" do not.
const MATCHERS = Object.entries(CUES).map(([tag, words]) => [tag, new RegExp(`\\b(${words.map(escape).join("|")})s?\\b`, "i")]);

export function interestsOf(text) {
  return MATCHERS.filter(([, re]) => re.test(text)).map(([tag]) => tag);
}

/** Active, public clubs only. Meeting times are not in The SOURCE's list, so `meets` is null. */
export function fromSource(rows) {
  return (rows || [])
    .filter((r) => r && r.Id && r.Name && r.Status === "Active" && r.Visibility === "Public")
    .map((r) => {
      const name = String(r.Name).trim();
      const description = String(r.Summary || "").trim();
      const categories = Array.isArray(r.CategoryNames) ? r.CategoryNames : [];
      return {
        id: `source-${r.Id}`,
        name,
        description,
        interests: interestsOf([name, description, ...categories].join(" ")),
        categories,
        meets: null,
        url: r.WebsiteKey ? SOURCE_ORG_URL + encodeURIComponent(r.WebsiteKey) : null,
      };
    });
}
