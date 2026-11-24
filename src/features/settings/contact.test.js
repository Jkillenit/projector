import { describe, expect, it } from "vitest";
import { checkEmail, checkPhone, cleanPhone } from "./contact.js";

describe("checkEmail", () => {
  it("accepts a normal address, and an empty one (it is not required to save)", () => {
    for (const ok of ["maya@crimson.ua.edu", "a.b+news@gmail.com", " maya@ua.edu ", ""]) expect(checkEmail(ok), ok).toBeNull();
  });

  it("explains what is wrong in plain words", () => {
    for (const bad of ["maya", "maya@", "@ua.edu", "maya@ua", "maya @ua.edu", "maya@@ua.edu"]) {
      expect(checkEmail(bad), bad).toBe("Check the email. It should look like name@crimson.ua.edu.");
    }
  });
});

describe("phone", () => {
  it("is optional, and takes a US number written any common way", () => {
    for (const ok of ["", "205-555-0142", "(205) 555-0142", "205.555.0142", "+1 205 555 0142", "2055550142"]) expect(checkPhone(ok), ok).toBeNull();
  });

  it("explains a number that is too short or has letters", () => {
    for (const bad of ["555-0142", "205-555-01422", "call me"]) expect(checkPhone(bad), bad).toBe("Check the phone number. Use 10 digits, like 205-555-0142.");
  });

  it("saves it in one plain form", () => {
    expect(cleanPhone("(205) 555-0142")).toBe("205-555-0142");
    expect(cleanPhone("+1 205 555 0142")).toBe("205-555-0142");
    expect(cleanPhone("")).toBe("");
  });
});
