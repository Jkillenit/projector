/**
 * Creates GitHub issues from a markdown backlog file, like docs/issues/next.md. Needs the GitHub CLI (gh), signed in.
 *
 *   node scripts/create-issues.mjs docs/issues/next.md --dry-run          show what it would do, change nothing
 *   node scripts/create-issues.mjs docs/issues/next.md                    create them
 *   node scripts/create-issues.mjs docs/issues/next.md --assignee @me     create them and assign to you
 *
 * File format: each issue starts with   <!-- issue key=M07 labels="map-3d,must" milestone="Map 3D proof of concept" -->
 * then a "# Title" line, then the body. {{M07}} in any body becomes issue M07's real number.
 * Tracking issues (label "epic") are made last, so all their links resolve. A link to an issue made later is filled in
 * with a second pass. Safe to run twice: an issue whose exact title already exists is reused, not made again.
 */
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const REPO = process.env.REPO || "Jkillenit/projector";
const LABELS = {
  "map-3d": ["8a1538", "Map 3D: walk me to my classroom"],
  rename: ["6f42c1", "Rename to AL"],
  companion: ["e99695", "AL campus guide companion"],
  epic: ["5319e7", "Tracks a group of issues"],
  decision: ["fbca04", "Needs a team decision"],
  task: ["c5def5", "Not code"],
  design: ["f9d0c4", "Art or design work"],
  demo: ["0e8a16", "Demo mode data"],
  a11y: ["1d76db", "Accessibility"],
  "tech-lead": ["b60205", "Touches files only the tech lead changes"],
  must: ["d93f0b", "MoSCoW: must"],
  should: ["fbca04", "MoSCoW: should"],
  could: ["c2e0c6", "MoSCoW: could"],
};
const LINK = /\{\{(\w+)\}\}/g;

/** Backlog text → [{ key, labels, milestone, title, body }] in file order. */
export function parseIssues(text) {
  const parts = text.replace(/\r\n/g, "\n").split(/^<!-- issue (.*?) -->[ \t]*$/m).slice(1);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const attrs = Object.fromEntries([...parts[i].matchAll(/(\w+)=(?:"([^"]*)"|(\S+))/g)].map((m) => [m[1], m[2] ?? m[3]]));
    const lines = parts[i + 1].trim().split("\n");
    out.push({
      key: attrs.key,
      labels: (attrs.labels || "").split(",").map((s) => s.trim()).filter(Boolean),
      milestone: attrs.milestone || "",
      title: lines[0].replace(/^#\s+/, "").trim(),
      body: lines.slice(1).join("\n").trim(),
    });
  }
  return out;
}

/** Problems with a parsed backlog, in plain words. Empty means good. */
export function checkIssues(issues, labels = LABELS) {
  const problems = [];
  const keys = new Set();
  for (const x of issues) {
    if (!x.key) problems.push(`"${x.title}" has no key`);
    else if (keys.has(x.key)) problems.push(`Key ${x.key} is used twice`);
    keys.add(x.key);
    if (!x.title) problems.push(`Issue ${x.key} has no title`);
    for (const l of x.labels) if (!labels[l]) problems.push(`Issue ${x.key} uses label "${l}", which is not in LABELS`);
  }
  for (const x of issues) for (const [, k] of x.body.matchAll(LINK)) if (!keys.has(k)) problems.push(`Issue ${x.key} links to {{${k}}}, which does not exist`);
  return problems;
}

/** Tracking issues last, everything else in file order. */
export const createOrder = (issues) => [...issues.filter((x) => !x.labels.includes("epic")), ...issues.filter((x) => x.labels.includes("epic"))];

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--assignee");
  if (!file) throw new Error("Usage: node scripts/create-issues.mjs <backlog.md> [--dry-run] [--assignee @me]");
  const dry = args.includes("--dry-run");
  const at = args.indexOf("--assignee");
  const assignee = at >= 0 ? args[at + 1] : null;

  const issues = parseIssues(readFileSync(file, "utf8"));
  const problems = checkIssues(issues);
  if (problems.length) {
    console.error(`Fix these first:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  const ordered = createOrder(issues);
  const milestoneNames = [...new Set(issues.map((x) => x.milestone).filter(Boolean))];

  if (dry) {
    console.log(`Would create in ${REPO}${assignee ? `, assigned to ${assignee}` : ""}:`);
    for (const m of ["", ...milestoneNames]) {
      const group = ordered.filter((x) => x.milestone === m);
      if (!group.length) continue;
      console.log(`\n  ${m || "(no milestone)"}`);
      for (const x of group) console.log(`    ${x.key.padEnd(4)} ${x.title}   [${x.labels.join(", ")}]`);
    }
    console.log(`\n${ordered.length} issues, ${milestoneNames.length} milestones. Run again without --dry-run to create them.`);
    return;
  }

  const gh = (...a) => execFileSync("gh", a, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();

  for (const [name, [color, description]] of Object.entries(LABELS)) {
    try {
      gh("label", "create", name, "--repo", REPO, "--color", color, "--description", description);
    } catch {
      // Already there. Leave its color and description alone.
    }
  }
  const existing = JSON.parse(gh("api", `repos/${REPO}/milestones?state=all&per_page=100`)).map((m) => m.title);
  for (const m of milestoneNames) if (!existing.includes(m)) gh("api", `repos/${REPO}/milestones`, "-f", `title=${m}`);

  const numbers = {};
  const fill = (body) => body.replace(LINK, (m, k) => (numbers[k] ? String(numbers[k]) : m));
  const later = [];
  for (const x of ordered) {
    const found = JSON.parse(gh("issue", "list", "--repo", REPO, "--state", "all", "--search", `"${x.title}" in:title`, "--json", "number,title"));
    const same = found.find((f) => f.title === x.title);
    if (same) {
      numbers[x.key] = same.number;
      console.log(`#${same.number}  already there: ${x.title}`);
      continue;
    }
    const body = fill(x.body);
    const a = ["issue", "create", "--repo", REPO, "--title", x.title, "--body", body];
    if (x.milestone) a.push("--milestone", x.milestone);
    for (const l of x.labels) a.push("--label", l);
    if (assignee) a.push("--assignee", assignee);
    numbers[x.key] = Number(gh(...a).split("/").pop());
    console.log(`#${numbers[x.key]}  ${x.title}`);
    if (LINK.test(body)) later.push(x);
    LINK.lastIndex = 0;
  }
  for (const x of later) {
    gh("issue", "edit", String(numbers[x.key]), "--repo", REPO, "--body", fill(x.body));
    console.log(`#${numbers[x.key]}  links filled in`);
  }
  const epics = issues.filter((x) => x.labels.includes("epic")).map((x) => `#${numbers[x.key]} ${x.title}`);
  console.log(`\nDone. Tracking issues:\n  ${epics.join("\n  ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
