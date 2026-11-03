export const SYNC_EVERY_MS = 30 * 60 * 1000;

/**
 * Whether a sync should start now. Start, login and the Sync now button always go (when signed in
 * and idle); the timer only fires once `SYNC_EVERY_MS` has passed since the last try.
 * @param {{ loggedIn: boolean, running: boolean, reason: "start"|"login"|"manual"|"tick", lastTryAt?: number|null, now?: number }} s
 */
export function shouldSync({ loggedIn, running, reason, lastTryAt = null, now = Date.now() }) {
  if (!loggedIn || running) return false;
  if (reason !== "tick") return true;
  return lastTryAt == null || now - lastTryAt >= SYNC_EVERY_MS;
}

const termOf = (c) => String(c.courseCode || "").match(/^(\d{6})/)?.[1] || null;

/**
 * Drops only courses from an older term. UA course codes start with the term ("202640-..."), so a
 * code with an older prefix than the latest is old; codes with no prefix (MIS 430 style, XC
 * items) are kept, never guessed away. shortcut: a future term would win over the current one;
 * upgrade if Blackboard lists future terms as available.
 */
export function currentTermCourses(courses) {
  const latest = courses.map(termOf).filter(Boolean).sort().pop();
  return courses.filter((c) => !termOf(c) || termOf(c) === latest);
}
