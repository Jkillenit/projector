/**
 * Grades that landed after the student's last visit, newest first.
 * `recent` rows come from db.dashboard.get().recentGrades: { name, score, points_possible, graded_at, course_name }.
 */
export function newGradesSince(recent, since) {
  const cutoff = Date.parse(since);
  return (recent || [])
    .filter((g) => g.score != null && Date.parse(g.graded_at) > (Number.isNaN(cutoff) ? 0 : cutoff))
    .sort((a, b) => Date.parse(b.graded_at) - Date.parse(a.graded_at));
}

/** "17/20 (85%)" */
export function scoreText(g) {
  const pts = Number(g.points_possible);
  if (!pts) return String(g.score);
  return `${g.score}/${pts} (${Math.round((g.score / pts) * 100)}%)`;
}

/** The visit marker: when the student was last here. A first visit looks back four days so the demo has news. */
export function lastVisitOrDefault(saved, now = new Date()) {
  return saved && !Number.isNaN(Date.parse(saved)) ? saved : new Date(now.getTime() - 4 * 86400000).toISOString();
}
