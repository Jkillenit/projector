import { checkIndoor } from "./indoorData.js";

/**
 * Splits what `studyHub.indoor.list()` gave into buildings we can use and files we skip, each with plain reasons.
 * Every file goes through checkIndoor. Demo mode lists Demo Hall only; Live mode reads <userData>/indoor (#63).
 */
export function sortIndoor(files) {
  const buildings = [];
  const skipped = [];
  const seen = new Set();
  for (const f of Array.isArray(files) ? files : []) {
    if (f?.error) {
      skipped.push({ file: f.file, problems: [f.error] });
      continue;
    }
    const { ok, problems } = checkIndoor(f?.data);
    if (!ok) skipped.push({ file: f?.file, problems });
    else if (seen.has(f.data.building)) skipped.push({ file: f.file, problems: [`Another file already has ${f.data.name}`] });
    else {
      seen.add(f.data.building);
      buildings.push(f.data);
    }
  }
  return { buildings, skipped };
}

let cached = null;

/** Read once per session and shared. `fresh` reads the folder again (Settings, after the student adds a file). */
export function loadIndoor({ fresh = false } = {}) {
  if (!cached || fresh) {
    cached = Promise.resolve(window.studyHub?.indoor?.list?.() ?? [])
      .catch(() => [])
      .then(sortIndoor);
  }
  return cached;
}
