import { describe, expect, it } from "vitest";
import { DEFAULTS, flagsFrom, parseFlags } from "./features.js";

describe("parseFlags", () => {
  it("turns names on and -names off, and ignores names it does not know", () => {
    expect(parseFlags("classesFirstHome")).toEqual({ classesFirstHome: true });
    expect(parseFlags("-classesFirstHome")).toEqual({ classesFirstHome: false });
    expect(parseFlags(" classesFirstHome , madeUp ")).toEqual({ classesFirstHome: true });
  });

  it("reads nothing from empty input", () => {
    for (const text of [undefined, null, "", " , "]) expect(parseFlags(text)).toEqual({});
  });
});

describe("flagsFrom", () => {
  it("starts from the defaults, with every hidden feature off", () => {
    expect(flagsFrom()).toEqual(DEFAULTS);
    expect(Object.values(DEFAULTS).every((on) => on === false)).toBe(true);
  });

  it("lets saved flags turn a feature on, and the address win over saved flags", () => {
    expect(flagsFrom({ stored: "classesFirstHome" }).classesFirstHome).toBe(true);
    expect(flagsFrom({ stored: "classesFirstHome", search: "?flags=-classesFirstHome" }).classesFirstHome).toBe(false);
    expect(flagsFrom({ search: "?x=1&flags=classesFirstHome" }).classesFirstHome).toBe(true);
  });
});
