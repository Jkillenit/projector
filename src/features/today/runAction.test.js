import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../mirror/openInBlackboard.js", () => ({ openInBlackboard: vi.fn() }));

const { openInBlackboard } = await import("../mirror/openInBlackboard.js");
const { runTodayAction } = await import("./runAction.js");

describe("runTodayAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens Blackboard for a blackboard action", () => {
    const open = vi.fn();
    runTodayAction({ type: "blackboard", url: "https://example.test/x", courseUuid: "c1" }, open);
    expect(openInBlackboard).toHaveBeenCalledWith("https://example.test/x");
    expect(open).not.toHaveBeenCalled();
  });

  it.each(["review", "grades"])("opens the course for a %s action", (type) => {
    const open = vi.fn();
    runTodayAction({ type, courseUuid: "c1" }, open);
    expect(open).toHaveBeenCalledWith("c1");
    expect(openInBlackboard).not.toHaveBeenCalled();
  });

  it("ignores a missing action", () => {
    const open = vi.fn();
    runTodayAction(null, open);
    expect(open).not.toHaveBeenCalled();
  });
});
