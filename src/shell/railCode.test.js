import { describe, expect, it } from "vitest";
import { railCode } from "./railCode.js";

describe("railCode", () => {
  it.each([
    ["MATH 126", "MATH"],
    ["ENGL 101", "ENGL"],
    ["CH 101", "CH"],
    ["Bama Bound", "BAMA"],
    ["UA AI Experience", "UA"],
    ["G.B.A. 490", "GBA"],
    ["", "?"],
    [null, "?"],
  ])("%s gives %s", (label, code) => expect(railCode(label)).toBe(code));
});
