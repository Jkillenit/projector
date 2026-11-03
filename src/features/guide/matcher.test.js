import { describe, expect, it } from "vitest";
import resources from "../../demo/resources.json";
import organizations from "../../demo/organizations.json";
import students from "../../demo/students.json";
import { CRISIS_MESSAGE, NOT_SURE_MESSAGE, SENSITIVE_MESSAGE, match, orgsAsResources, pickForYou } from "./matcher.js";
import { ASK_COPY } from "./copy.js";

const maya = students.find((s) => s.id === "maya");
const pool = [...resources, ...orgsAsResources(organizations)];
const ask = (text, student = maya) => match(text, student, pool);

describe("crisis", () => {
  it.each(["I want to kill myself", "thinking about suicide", "I might hurt someone", "self harm", "I don't want to live anymore", "I'm not okay and I don't know who to talk to.", "I can't do this anymore"])("catches %s", (text) => {
    const out = ask(text);
    expect(out.kind).toBe("crisis");
    expect(out.items).toEqual([]);
    expect(out.message).toBe(CRISIS_MESSAGE);
    expect(out.message).toMatch(/988/);
    expect(out.contacts[0].detail).toMatch(/988/);
    expect(out.contacts[1].resourceId).toBe("counseling-center");
    expect(out.doNotStore).toBe(true);
  });

  it("runs before any matching, even when the text also asks for tutoring", () => {
    expect(ask("I'm failing calc and want to kill myself").kind).toBe("crisis");
  });
});

describe("sensitive", () => {
  it.each([
    ["I need accommodations for my ADHD", "disability-services"],
    ["I was harassed by someone in my class", "title-ix"],
    ["I feel so much anxiety about school", "counseling-center"],
    ["I think I'm sick and need a doctor", "student-health"],
    ["I can't afford rent this month", "financial-aid"],
  ])("sends %s to one office and does not store it", (text, officeId) => {
    const out = ask(text);
    expect(out.kind).toBe("sensitive");
    expect(out.items).toHaveLength(1);
    expect(out.items[0].resource.id).toBe(officeId);
    expect(out.message).toBe(SENSITIVE_MESSAGE);
    expect(out.doNotStore).toBe(true);
  });
});

describe("matched", () => {
  it("matches a failing class to tutoring first, with a reason and source on every pick", () => {
    const out = ask("I'm failing Calc 2");
    expect(out.kind).toBe("matched");
    expect(out.items.length).toBeGreaterThanOrEqual(2);
    expect(out.items.length).toBeLessThanOrEqual(3);
    expect(out.items[0].resource.id).toBe("ingenuity-lab-tutoring");
    for (const item of out.items) {
      expect(item.why.length).toBeGreaterThan(5);
      expect(item).toHaveProperty("source_url");
      expect(item).toHaveProperty("last_checked");
      expect(item.resource.sensitive).toBe(false);
    }
    expect(out.doNotStore).toBeUndefined();
  });

  it("finds clubs for an interest", () => {
    const out = ask("Find a club for coding");
    expect(out.kind).toBe("matched");
    expect(out.items[0].resource.id).toMatch(/^org-/);
  });

  it("answers the books question without a sensitive office", () => {
    const out = ask("Where do I get help paying for books");
    expect(out.kind).toBe("matched");
    expect(out.items.map((i) => i.resource.id)).toContain("textbook-help");
  });

  it("forgives a typo", () => {
    expect(ask("tutoing for chemistry").kind).toBe("matched");
  });
});

describe("not_sure", () => {
  it.each(["asdf qwerty", "", "   ", "zzzz"])("falls back for %j", (text) => {
    const out = ask(text);
    expect(out.kind).toBe("not_sure");
    expect(out.items).toEqual([]);
    expect(out.message).toBe(NOT_SURE_MESSAGE);
    expect(out.directoryLink).toBe("resources");
  });
});

describe("pickForYou", () => {
  it("returns three picks and puts tutoring first for a weak course", () => {
    const picks = pickForYou(maya, pool, { weakCourse: "Calculus II" });
    expect(picks).toHaveLength(3);
    expect(picks[0].resource.category).toBe("tutoring");
    expect(picks.every((p) => !p.resource.sensitive)).toBe(true);
  });
  it("still returns three with no context", () => {
    expect(pickForYou({ interests: [] }, pool)).toHaveLength(3);
  });
});

describe("never asks for a password or a code", () => {
  const ASKS = /\b(enter|type|share|send|give|tell|provide|paste)\b[^.?!]*\b(password|passcode|pin|ssn|verification code|one[- ]time code|okta code)/i;
  const strings = [
    ...Object.values(ASK_COPY),
    CRISIS_MESSAGE,
    NOT_SURE_MESSAGE,
    SENSITIVE_MESSAGE,
    ...resources.flatMap((r) => [r.name, r.description, ...r.how_to_get_in.map((s) => s.text)]),
    ...["I'm failing Calc 2", "okta login code", "I forgot my password", "asdf"].flatMap((q) => {
      const out = ask(q);
      return [out.message, ...out.items.map((i) => i.why)];
    }),
  ];
  it("has no copy that requests one", () => {
    for (const s of strings) expect(s, s).not.toMatch(ASKS);
  });
  it("answers a login question with a place to get help, not a request", () => {
    const out = ask("I forgot my password for okta");
    expect(out.items.map((i) => i.resource.id)).toContain("okta-verify-help");
  });
});

describe("Ask demo questions", () => {
  it("covers all four states", () => {
    expect(ask("I'm behind in MATH 126 and the exam is Sunday").kind).toBe("matched");
    expect(ask("How do I get extra time on exams?").kind).toBe("sensitive");
    expect(ask("I'm not okay and I don't know who to talk to.").kind).toBe("crisis");
    expect(ask("Who do I talk to about a late drop refund?").kind).toBe("not_sure");
  });
});
