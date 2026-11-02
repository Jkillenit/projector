/**
 * The scripted guide. Pure rules, no LLM, no network. Safety order matters:
 *   1. crisis    -> 988 and the Counseling Center, no picks
 *   2. sensitive -> one official office, never stored
 *   3. matched   -> 2 or 3 resources, each with a one line reason
 *   4. not_sure  -> the full directory and who to ask
 * Do not weaken these checks without the safety lead's review (see CLAUDE.md).
 */

import { near } from "../../lib/fuzzy.js";

export const NOT_SURE_MESSAGE = "I'm not sure. Here's the full directory and who to ask.";
export const CRISIS_MESSAGE = "You are not alone. Please talk to a person right now. Call or text 988 any time.";
export const SENSITIVE_MESSAGE = "This is best handled by a person. Here is the official office. You can talk to a person there.";

export const CRISIS_PATTERNS = [
  /\bself[- ]?harm/,
  /\bsuicid/,
  /\bkill (my ?self|me)\b/,
  /\bend (my life|it all)\b/,
  /\bwant to die\b/,
  /\bdon'?t want to (live|be alive|be here)\b/,
  /\b(hurt|harm|kill) (my ?self|someone|somebody|other people|others)\b/,
  /\bcut(ting)? my ?self\b/,
];

/** Each group names the one office that owns the topic. */
export const SENSITIVE_GROUPS = [
  { id: "title-ix", pattern: /\b(title ix|harass|assault|stalk|rape|abuse|discriminat|unsafe)/ },
  { id: "disability-services", pattern: /\b(disabilit|accommodat|adhd|dyslex|extra time|learning difference)/ },
  { id: "counseling-center", pattern: /\b(anxi|depress|stress|therapy|therapist|counsel|mental health|overwhelm|panic|lonely)/ },
  { id: "student-health", pattern: /\b(sick|illness|doctor|nurse|medical|injur|vaccin|prescription|health)/ },
  { id: "financial-aid", pattern: /\b(can'?t afford|cannot afford|hardship|broke|evict|homeless|hungry|can'?t (pay|eat)|no money|out of money)/ },
];

const STOPWORDS = new Set(
  "a an and are am as at be by do does for from get help how i im i'm in is it me my of on or the to we what where who with can need want find need looking some something someone about please".split(" ")
);

const normalize = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const wordsOf = (text) => normalize(text).split(" ").filter((w) => w && !STOPWORDS.has(w));

/** A typed word hits a tag word when equal, or when one starts the other (4+ letters), so "tutor" finds "tutoring". */
function wordHit(word, tagWord) {
  if (word === tagWord) return true;
  const [short, long] = word.length <= tagWord.length ? [word, tagWord] : [tagWord, word];
  if (short.length >= 4 && long.startsWith(short)) return true;
  return word.length >= 5 && tagWord.length >= 5 && near(word, tagWord);
}

/** Score one resource for the words typed. Returns { score, hits }. */
function scoreResource(text, words, student, resource) {
  const hits = new Set();
  let score = 0;
  const q = normalize(text);
  for (const tag of resource.tags || []) {
    const t = normalize(tag);
    if (t.includes(" ") && q.includes(t)) {
      score += 4;
      hits.add(tag);
      continue;
    }
    const tagWords = t.split(" ");
    for (const w of words) {
      if (tagWords.some((tw) => wordHit(w, tw))) {
        score += 3;
        hits.add(w);
      }
    }
  }
  const nameWords = normalize(resource.name).split(" ");
  for (const w of words) {
    if (nameWords.some((nw) => wordHit(w, nw))) {
      score += 2;
      hits.add(w);
    }
  }
  if (score > 0) {
    const mine = new Set(student?.interests || []);
    if ((resource.tags || []).some((t) => mine.has(t))) score += 1;
  }
  return { score, hits: [...hits] };
}

const whyFor = (hits, resource) =>
  hits.length ? `You mentioned ${hits.slice(0, 3).join(", ")}, and this covers it.` : `Fits what you asked about: ${resource.description}`;

const toItem = (resource, why) => ({ resource, why, source_url: resource.source_url, last_checked: resource.last_checked });

/** Top resources for some words. Sensitive offices never come through here. */
function rank(text, student, resources, { min = 3, max = 3 } = {}) {
  const words = wordsOf(text);
  if (!words.length) return [];
  return resources
    .filter((r) => !r.sensitive)
    .map((r) => ({ r, ...scoreResource(text, words, student, r) }))
    .filter((x) => x.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => toItem(x.r, whyFor(x.hits, x.r)));
}

/**
 * @returns {{ kind: "crisis"|"sensitive"|"matched"|"not_sure", items: object[], message: string, doNotStore?: boolean }}
 */
export function match(text, student, resources) {
  const q = normalize(text);

  if (CRISIS_PATTERNS.some((p) => p.test(q))) {
    return {
      kind: "crisis",
      items: [],
      message: CRISIS_MESSAGE,
      contacts: [
        { label: "988 Suicide and Crisis Lifeline", detail: "Call or text 988" },
        { label: "UA Counseling Center", resourceId: "counseling-center" },
      ],
      doNotStore: true,
    };
  }

  const group = SENSITIVE_GROUPS.find((g) => g.pattern.test(q));
  if (group) {
    const office = (resources || []).find((r) => r.id === group.id);
    return { kind: "sensitive", items: office ? [toItem(office, "This office handles it. Talk to a person there.")] : [], message: SENSITIVE_MESSAGE, doNotStore: true };
  }

  const items = rank(text, student, resources || []);
  if (items.length >= 2) return { kind: "matched", items, message: "Here is where I would start." };
  if (items.length === 1) {
    // One strong hit: add the closest weaker hit so the student has a second option.
    const more = rank(text, student, (resources || []).filter((r) => r.id !== items[0].resource.id), { min: 1, max: 1 });
    if (more.length) return { kind: "matched", items: [...items, ...more], message: "Here is where I would start." };
  }
  return { kind: "not_sure", items: [], message: NOT_SURE_MESSAGE, directoryLink: "resources" };
}

/**
 * Three cards for Home. `context.weakCourse` is the name of a course the student is below target in.
 * Falls back to a safe default list so Home always has something useful.
 */
export function pickForYou(student, resources, context = {}) {
  const text = [context.weakCourse ? `failing ${context.weakCourse} tutoring` : "", ...(student?.interests || [])].join(" ");
  const mine = new Set(student?.interests || []);
  const picks = rank(text, student, resources || [], { min: 3, max: 3 }).map((p) => {
    const shared = (p.resource.tags || []).filter((t) => mine.has(t));
    if (context.weakCourse && p.resource.category === "tutoring") return { ...p, why: `You are below your goal in ${context.weakCourse}. Tutoring can help.` };
    if (shared.length) return { ...p, why: `Fits your interest in ${shared.join(" and ")}.` };
    return { ...p, why: context.weakCourse ? `Can help while ${context.weakCourse} is hard.` : p.why };
  });
  for (const id of ["writing-center", "the-source", "center-for-academic-success"]) {
    if (picks.length >= 3) break;
    const r = (resources || []).find((x) => x.id === id);
    if (r && !picks.some((p) => p.resource.id === id)) picks.push(toItem(r, id === "the-source" ? "Find a club that fits your time." : "A good first stop for most students."));
  }
  return picks.slice(0, 3);
}

/** Clubs shown to the guide as resources, so "find a club for coding" works. */
export function orgsAsResources(orgs) {
  return (orgs || []).map((o) => ({
    id: `org-${o.id}`,
    name: o.name,
    category: "org_directory",
    sensitive: false,
    description: o.description,
    tags: ["club", "clubs", "group", "meet people", ...o.interests],
    how_to_get_in: [{ text: `Go to a meeting on ${o.meets.day} at ${o.meets.start}`, login_needed: false }],
    source_url: "TODO verify",
    last_checked: "TODO verify",
    verified: false,
  }));
}
