const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** True when the club meets inside one of the student's free windows. */
export function fitsFreeTime(club, student) {
  const { day, start, end } = club.meets || {};
  return (student?.free_times || []).some((w) => w.day === day && toMin(start) >= toMin(w.from) && toMin(end) <= toMin(w.to));
}

/** Interests the club shares with the student. */
export const sharedInterests = (club, student) => (club.interests || []).filter((i) => (student?.interests || []).includes(i));

/**
 * Clubs best first: shared interests count most, fitting free time breaks ties.
 * With no interests picked, every club stays in the list (free-time fits first).
 */
export function rankClubs(clubs, student, { interest = null } = {}) {
  return (clubs || [])
    .filter((c) => !interest || c.interests.includes(interest))
    .map((club) => ({ club, shared: sharedInterests(club, student), fits: fitsFreeTime(club, student) }))
    .sort((a, b) => b.shared.length - a.shared.length || Number(b.fits) - Number(a.fits) || a.club.name.localeCompare(b.club.name));
}

export const meetingText = (club) => `${club.meets.day} ${club.meets.start} to ${club.meets.end}`;
