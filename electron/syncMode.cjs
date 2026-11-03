const FULL_EVERY_MS = 7 * 24 * 3600 * 1000;

/** Full sync (content tree + syllabus lookup) on the first sync, when forced, or once a week; light otherwise. */
function needsFull({ lastFullAt, force = false, now = Date.now() }) {
  if (force || !lastFullAt) return true;
  const last = Date.parse(lastFullAt);
  return Number.isNaN(last) || now - last >= FULL_EVERY_MS;
}

/** The cached syllabus lookup is still good when it found one and its source items haven't changed. */
function syllabusUnchanged(cached, fingerprint) {
  return !!cached && cached.found === true && cached.fingerprint === fingerprint;
}

module.exports = { FULL_EVERY_MS, needsFull, syllabusUnchanged };
