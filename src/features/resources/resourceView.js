/** How resources from src/demo/resources.json read on screen. Missing facts show as [placeholders], never made up. */

export const CATEGORIES = [
  ["all", "All"],
  ["study", "Study help"],
  ["money", "Money"],
  ["health", "Health"],
  ["career", "Career"],
  ["tech", "Tech"],
  ["rec", "Recreation"],
];

/** Category ids in the data → the filter they belong to. */
const FILTER_OF = { tutoring: "study", academic: "study", org_directory: "rec" };
export const filterOf = (r) => FILTER_OF[r.category] || r.category;
const LABELS = { tutoring: "Tutoring", academic: "Study help", health: "Health", money: "Money", career: "Career", rec: "Recreation", tech: "Tech", org_directory: "Clubs" };
export const categoryLabel = (r) => LABELS[r.category] || r.category;

export const isHttp = (url) => /^https?:\/\//i.test(String(url || ""));
export const siteUrl = (r) => (isHttp(r.source_url) ? r.source_url : null);
export const signInNeeded = (r) => (r.how_to_get_in || []).some((s) => s.login_needed);
export const stepsOf = (r) => (r.how_to_get_in || []).map((s) => s.text);

/** "ua.edu" from the source URL, or "[source]" while it is still unverified. */
export function sourceName(r) {
  if (!isHttp(r.source_url)) return "[source]";
  return new URL(r.source_url).hostname.replace(/^www\./, "");
}

/** "Checked Oct 28", or "Checked [date]" until someone has checked it. */
export function checkedLabel(r) {
  const m = String(r.last_checked || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "Checked [date]";
  return `Checked ${new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** Text the Campus search matches: name, tags, category and description. */
export const searchText = (r) => [r.name, ...(r.tags || []), ...(r.synonyms || []), categoryLabel(r), r.description].join(" ");
