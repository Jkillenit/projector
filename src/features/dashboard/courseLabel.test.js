import { describe, expect, it } from "vitest";
import { friendlyCourse } from "./courseLabel.js";

describe("friendlyCourse", () => {
  it("joins the code from the course ID with the Blackboard name", () => {
    const f = friendlyCourse({ courseCode: "202640-MKT-300-001", name: "Digital & Social Media Marketing" });
    expect(f.label).toBe("MKT 300 · Digital & Social Media Marketing");
    expect(f.raw).toContain("202640-MKT-300-001");
  });

  it("drops a code the name already starts with", () => {
    expect(friendlyCourse({ courseCode: "202640-GBA-490-002", name: "GBA 490: Strategy" }).label).toBe("GBA 490 · Strategy");
  });

  it("never shows a raw ID as the title", () => {
    expect(friendlyCourse({ courseCode: "202640-MIS-430-001", name: "202640-MIS-430-001" }).label).toBe("MIS 430");
  });

  it("falls back to the name when there is no code", () => {
    expect(friendlyCourse({ name: "Study Skills" }).label).toBe("Study Skills");
    expect(friendlyCourse({ courseCode: "XC", name: "XC" }).label).toBe("XC");
  });
});
