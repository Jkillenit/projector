/**
 * Course numbers in a question (#211): "I'm failing 126" means the student's own MATH 126. Pure, no network.
 * Only course codes are used, never grades (CLAUDE.md rule 4; the safety lead signed off on codes).
 */

// Short words that can sit before a number but are not subjects: "for 126", "my 101", "with 221".
const NOT_SUBJECTS = new Set(
  "a am an and are at be but by can do for get got had has have help i im in is it its me my need no not of on or our so take the to too up was we with you exam test quiz room page unit hw".split(" ")
);
const inRange = (n) => +n >= 100 && +n < 700;

/** "MATH 126", "math126", "Math-126" → "MATH 126". Null when it is not a subject plus a number. */
export function codeKey(code) {
  const m = String(code ?? "").trim().match(/^([a-z]{2,5})[\s-]*(\d{3}[a-z]?)$/i);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

/** Course references in some text: [{ subject, number }] for codes, [{ number }] for a bare course number. */
export function courseRefs(text) {
  const s = String(text ?? "");
  const out = [];
  const taken = new Set();
  for (const m of s.matchAll(/\b([a-z]{2,4})[\s-]*(\d{3})(?!\d)/gi)) {
    if (NOT_SUBJECTS.has(m[1].toLowerCase()) || !inRange(m[2])) continue;
    out.push({ subject: m[1].toUpperCase(), number: m[2] });
    taken.add(m.index + m[0].length - 3);
  }
  // A bare three digit number, not money ($200), not part of a longer number (2000, 1.250).
  for (const m of s.matchAll(/(?<![\d$.,])\b(\d{3})\b(?![\d]|[.,]\d)/g)) {
    if (!taken.has(m.index) && inRange(m[1])) out.push({ number: m[1] });
  }
  return out;
}

/**
 * The student's own courses the text names, in their order. A code names just that course; a bare number names
 * every course with that number. A "subject" the student does not take ("for", "ST") counts as a bare number.
 */
export function coursesAsked(text, courses) {
  const mine = (courses || []).map((c) => ({ code: c, key: codeKey(c) })).filter((c) => c.key);
  const subjects = new Set(mine.map((c) => c.key.split(" ")[0]));
  const hit = new Set();
  for (const ref of courseRefs(text)) {
    for (const c of mine) {
      const [subject, number] = c.key.split(" ");
      if (number.replace(/[A-Z]$/, "") !== ref.number) continue;
      if (!ref.subject || !subjects.has(ref.subject) || ref.subject === subject) hit.add(c.code);
    }
  }
  return mine.map((c) => c.code).filter((code) => hit.has(code));
}

/** Words that mean "help me with this class". Without one, a course number is left to the usual matching. */
export const HELP_INTENT = /\b(tutor\w*|fail\w*|struggl\w*|behind|lost|help|study\w*|exam|test|midterm|final|quiz\w*|homework|review|understand|stuck|hard)\b/i;
