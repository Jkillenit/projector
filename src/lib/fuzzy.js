const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Edit distance up to 1 (one insert, delete, swap or replace). Cheap typo tolerance for words of 4+ letters. */
export function near(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length || i === b.length) return true;
  return (
    a.slice(i + 1) === b.slice(i + 1) ||
    a.slice(i + 1) === b.slice(i) ||
    a.slice(i) === b.slice(i + 1) ||
    (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
  );
}

/**
 * Score `query` against `text`: 0 = no match, higher is better. Every query word must hit.
 * A word hits as a prefix (best), inside a word, or within one typo of a word.
 */
export function fuzzyScore(query, text) {
  const words = norm(query).split(" ").filter(Boolean);
  if (!words.length) return 1;
  const hay = norm(text);
  const hayWords = hay.split(" ");
  let total = 0;
  for (const w of words) {
    if (hayWords.some((h) => h.startsWith(w))) total += 3;
    else if (hay.includes(w)) total += 2;
    else if (w.length >= 4 && hayWords.some((h) => near(w, h) || near(w, h.slice(0, w.length)))) total += 1;
    else return 0;
  }
  return total / words.length;
}

/** Items matching `query`, best first. `textOf(item)` returns the searchable string. */
export function fuzzyFilter(items, query, textOf) {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, textOf(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
