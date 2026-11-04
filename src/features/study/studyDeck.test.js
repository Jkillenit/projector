import { describe, expect, it } from "vitest";
import { MAX_SIDE, afterReview, cardFields, dueText, reviewQueue } from "./studyDeck.js";

const NOW = new Date(2026, 10, 4, 15, 0); // Nov 4, 2026, local

describe("study deck", () => {
  it("needs a front and a back, trims them, and caps the length", () => {
    expect(cardFields("  limit of 1/n ", " 0 ")).toEqual({ front: "limit of 1/n", back: "0" });
    expect(cardFields("front", "   ")).toBeNull();
    expect(cardFields("x".repeat(MAX_SIDE + 50), "y").front).toHaveLength(MAX_SIDE);
  });

  it("queues due cards, overdue first and new cards last, and skips cards not due yet", () => {
    const cards = [
      { uuid: "new" },
      { uuid: "today", next_review: "2026-11-04" },
      { uuid: "later", next_review: "2026-11-20" },
      { uuid: "overdue", next_review: "2026-10-30" },
    ];
    expect(reviewQueue(cards, NOW).map((c) => c.uuid)).toEqual(["overdue", "today", "new"]);
  });

  it("schedules with SM-2: Good on a new card is 1 day, then 6, and Again starts over", () => {
    const first = afterReview({ uuid: "c1" }, 4, NOW);
    expect(first.card).toMatchObject({ intervalDays: 1, repetitions: 1, next_review: "2026-11-05", lastReview: "2026-11-04", lastGrade: 4 });
    expect(first.mastery).toMatchObject({ flashcardUuid: "c1", grade: 4, intervalDays: 1, repetitions: 1, nextReview: "2026-11-05" });

    const second = afterReview(first.card, 4, NOW);
    expect(second.card).toMatchObject({ intervalDays: 6, repetitions: 2, next_review: "2026-11-10" });

    const forgot = afterReview(second.card, 1, NOW);
    expect(forgot.card).toMatchObject({ intervalDays: 1, repetitions: 0 });
    expect(forgot.card.easeFactor).toBeLessThan(second.card.easeFactor);
  });

  it("says how many cards are due in plain words", () => {
    expect(dueText(0)).toBe("Nothing due today");
    expect(dueText(1)).toBe("1 card due");
    expect(dueText(4)).toBe("4 cards due");
  });
});
