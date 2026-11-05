import { describe, expect, it } from "vitest";
import { assertSafeToSend, prepareSend } from "./sendGuard.js";

describe("send guard", () => {
  it("shows the student what will be sent, value by value", () => {
    const out = prepareSend({
      service: "Tutoring booking",
      verb: "Book",
      summary: ["Calculus II tutor", "Thu, Nov 6, 3:00 PM", "Ingenuity Lab"],
      payload: { sessionId: "s-123", studentEmail: "student@crimson.ua.edu" },
    });
    expect(out.title).toBe("Book with Tutoring booking?");
    expect(out.lines).toEqual(["Calculus II tutor", "Thu, Nov 6, 3:00 PM", "Ingenuity Lab"]);
    expect(out.sent).toEqual(["session id: s-123", "student email: student@crimson.ua.edu"]);
  });

  it("never sends grades or course work, at any depth (rule 4)", () => {
    expect(() => assertSafeToSend({ course: { currentGrade: 91 } })).toThrow(/course\.currentGrade/);
    expect(() => assertSafeToSend({ gpa: 3.4 })).toThrow(/rule 4/);
    expect(() => prepareSend({ service: "X", verb: "Send", payload: { scores: [90, 80] } })).toThrow();
    expect(() => assertSafeToSend({ sessionId: "a", when: "2026-11-06" })).not.toThrow();
  });

  it("needs a service and a verb", () => {
    expect(() => prepareSend({ verb: "Book" })).toThrow();
    expect(() => prepareSend(null)).toThrow();
  });
});
