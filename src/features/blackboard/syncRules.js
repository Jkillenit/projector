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

/**
 * Courses of the current term only. UA course codes start with the term ("202640-..."), so the
 * latest term prefix wins. shortcut: codes without a prefix are kept when none has one, and a
 * future term would win over the current one; upgrade if Blackboard lists future terms as available.
 */
export function currentTermCourses(courses) {
  const term = (c) => String(c.courseCode || "").match(/^(\d{6})/)?.[1] || null;
  const latest = courses.map(term).filter(Boolean).sort().pop();
  return latest ? courses.filter((c) => term(c) === latest) : courses;
}
