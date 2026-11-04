import { getDueCards, localDateString, sm2 } from "../../lib/sm2.js";

export const MAX_SIDE = 500;

/** Trimmed front and back, or null when either side is empty. Long sides are cut to MAX_SIDE. */
export function cardFields(front, back) {
  const f = String(front || "").trim().slice(0, MAX_SIDE);
  const b = String(back || "").trim().slice(0, MAX_SIDE);
  return f && b ? { front: f, back: b } : null;
}

/** Due cards, overdue first; never-reviewed cards go last so old cards are not crowded out. */
export function reviewQueue(cards, now = new Date()) {
  const rank = (c) => c.next_review || "9999-12-31";
  return getDueCards(cards, { now }).sort((a, b) => rank(a).localeCompare(rank(b)));
}

/** The card after a rating, in the shape courseStore reads back, plus the payload db:mastery:update takes. */
export function afterReview(card, grade, now = new Date()) {
  const next = sm2(card, grade, { now });
  return {
    card: { ...card, easeFactor: next.easeFactor, intervalDays: next.intervalDays, repetitions: next.repetitions, next_review: next.nextReview, lastReview: localDateString(now), lastGrade: grade },
    mastery: { flashcardUuid: card.uuid || card.id, grade, ...next },
  };
}

/** "3 cards due" / "Nothing due today" */
export function dueText(count) {
  if (!count) return "Nothing due today";
  return `${count} ${count === 1 ? "card" : "cards"} due`;
}
