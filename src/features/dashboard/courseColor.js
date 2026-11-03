/** Fixed palette of course colors: --course-1 .. --course-8 in studyhub-bootstrap.css (one set per theme). */
export const PALETTE_SIZE = 8;

/** { [courseId]: 1..8 }. Ids are sorted so a course keeps its color between visits; `last` ids (organizations) go after the rest. */
export function colorIndexes(ids, last = []) {
  const tail = new Set(last);
  const order = [...new Set(ids)].filter((id) => !tail.has(id)).sort().concat([...tail].sort());
  return Object.fromEntries(order.map((id, i) => [id, (i % PALETTE_SIZE) + 1]));
}

/** CSS color for a course, or a neutral grey when the id is unknown. */
export const courseColor = (indexes, id) => (indexes?.[id] ? `var(--course-${indexes[id]})` : "var(--fd-text-3)");
