/** Six course color slots, --c1-* .. --c6-* in src/styles/tokens.css. Slot 5 is gray. */
export const PALETTE_SIZE = 6;
export const GRAY_SLOT = 5;
const COLOR_SLOTS = [1, 2, 3, 4, 6];

/** Non-credit shells (orientation and the like) always get gray. */
export const isShell = (name) => /\b(orientation|bama bound)\b/i.test(String(name || ""));

/**
 * { [key]: slot } for `keys` in course list order. A key in `saved` keeps its slot, so a course keeps
 * its color between syncs; new keys take the first free color slot by position. `gray` keys get slot 5.
 */
export function assignColors(keys, saved = {}, gray = []) {
  const grayKeys = new Set(gray);
  const out = {};
  const used = new Set();
  for (const k of keys) {
    if (grayKeys.has(k)) out[k] = GRAY_SLOT;
    else if (COLOR_SLOTS.includes(saved[k])) {
      out[k] = saved[k];
      used.add(saved[k]);
    }
  }
  let n = 0;
  for (const k of keys) {
    if (out[k]) continue;
    const free = COLOR_SLOTS.find((s) => !used.has(s));
    out[k] = free ?? COLOR_SLOTS[n % COLOR_SLOTS.length];
    if (free) used.add(free);
    n += 1;
  }
  return out;
}

/** CSS colors for a slot: { dot, text, tint, wash }. Unknown courses are gray. */
export function getCourseColor(slot) {
  const s = slot || GRAY_SLOT;
  return { dot: `var(--c${s}-dot)`, text: `var(--c${s}-text)`, tint: `var(--c${s}-tint)`, wash: `var(--c${s}-wash)` };
}

/** Inline style that hands a course's colors to CSS as --course, --course-text, --course-tint, --course-wash. */
export const courseStyle = (c) => ({ "--course": c.dot, "--course-text": c.text, "--course-tint": c.tint, "--course-wash": c.wash });
