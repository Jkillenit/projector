/** Done = ticked off, submitted or attempted on Blackboard, or scored. A scored item is never overdue. */
export const isDone = (a) => !!(a?.completed || a?.submitted || a?.score != null);

const due = (a) => Date.parse(a.due_date);

/**
 * To do: not done and not past due, soonest first (undated last).
 * Missing: past due and not done, most recent first. Done: everything done, latest due first.
 */
export function groupAssignments(rows, now = new Date()) {
  const t = now.getTime();
  const todo = [];
  const missing = [];
  const done = [];
  for (const a of rows || []) {
    if (isDone(a)) done.push(a);
    else if (a.due_date && due(a) < t) missing.push(a);
    else todo.push(a);
  }
  const inf = (a) => (a.due_date ? due(a) : Infinity);
  todo.sort((a, b) => (inf(a) === inf(b) ? 0 : inf(a) < inf(b) ? -1 : 1));
  missing.sort((a, b) => due(b) - due(a));
  done.sort((a, b) => (due(b) || 0) - (due(a) || 0));
  return { todo, missing, done };
}
