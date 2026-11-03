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

/** Term code from either UA course ID format: "202640-SS.GBA-490-910-..." (prefix) or "41874.202640" (suffix). */
export function termCode(courseId) {
  const id = String(courseId || "").trim();
  return id.match(/^(\d{6})(?!\d)/)?.[1] || id.match(/\.(\d{6})$/)?.[1] || null;
}

/**
 * When a term code ends. shortcut: the last two digits are mapped to season-end dates by rule of
 * thumb (10 spring, 20/30 summer, 40 fall), not read from Blackboard; swap in real term dates if
 * a term ever ends noticeably earlier or later.
 */
export function termEnd(code) {
  const year = Number(code.slice(0, 4));
  const tt = Number(code.slice(4));
  if (tt <= 10) return new Date(year, 5, 1);
  if (tt <= 30) return new Date(year, 8, 1);
  return new Date(year + 1, 0, 1);
}

/**
 * Whether an enrollment is in a term that hasn't ended (upcoming terms count). Term code first, then
 * the course or term end date, then plain availability. Nothing is kept without evidence.
 * @param {{ courseCode?: string, endDate?: string|null, available?: string }} e
 * @returns {{ keep: boolean, ended: boolean, reason: string }}
 */
export function courseTermState(e, now = new Date()) {
  const code = termCode(e.courseCode);
  if (code) {
    const live = termEnd(code) > now;
    return { keep: live, ended: !live, reason: live ? `term ${code} not ended` : `skipped: term ${code} ended` };
  }
  const end = e.endDate ? new Date(e.endDate) : null;
  if (end && !Number.isNaN(end.getTime())) {
    const live = end > now;
    return { keep: live, ended: !live, reason: live ? "course dates not ended" : "skipped: course dates ended" };
  }
  if (e.available === "Yes") return { keep: true, ended: false, reason: "no term in ID, available now" };
  return { keep: false, ended: false, reason: "skipped: no term in ID, no dates, not available" };
}
