import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SERVICES, byId, partitionOf, allowedHost } = require("./services.cjs");
const { safePath, shapeOf, queryKeys } = require("./probeShape.cjs");

describe("connection services", () => {
  it("knows each service, and only myBama is ready", () => {
    expect(SERVICES.map((s) => s.id)).toEqual(["mybama", "tutoring", "tickets", "waze", "whatsthemove"]);
    expect(SERVICES.filter((s) => s.ready).map((s) => s.id)).toEqual(["mybama"]);
    expect(SERVICES.every((s) => s.reads && s.sends)).toBe(true);
    expect(byId("nope")).toBeNull();
  });

  it("gives each service its own cookie store", () => {
    expect(partitionOf("mybama")).toBe("persist:conn-mybama");
    expect(new Set(SERVICES.map((s) => partitionOf(s.id))).size).toBe(SERVICES.length);
  });

  it("keeps the myBama window on UA and its sign-in pages, https only", () => {
    const mybama = byId("mybama");
    expect(allowedHost(mybama, "https://mybama.ua.edu/")).toBe(true);
    expect(allowedHost(mybama, "https://ua.okta.com/app/x")).toBe(true);
    expect(allowedHost(mybama, "http://mybama.ua.edu/")).toBe(false);
    expect(allowedHost(mybama, "https://evil-ua.edu.example.com/")).toBe(false);
    expect(allowedHost(mybama, "https://notua.edu/")).toBe(false);
  });
});

describe("probe keeps no student data", () => {
  it("drops the query and any ids from the path", () => {
    expect(safePath("https://ssb.ua.edu/api/student/12345678/schedule?term=202640&pidm=99")).toBe("ssb.ua.edu/api/student/:n/schedule");
    expect(safePath("https://x.ua.edu/u/jdoe@crimson.ua.edu/a1b2c3d4e5f6a7b8c9d0")).toBe("x.ua.edu/u/:n/:n");
    expect(safePath("not a url")).toBe("");
  });

  it("describes JSON by keys and types only, never values", () => {
    const body = { student: { name: "Jane Doe", id: 12345678 }, meetings: [{ building: "BIDG", room: "116", days: ["M", "W"] }, { building: "SHEL" }] };
    const shape = shapeOf(body);
    expect(shape).toEqual({ student: { name: "string", id: "number" }, meetings: ["2 items", { building: "string", room: "string", days: ["2 items", "string"] }] });
    expect(JSON.stringify(shape)).not.toMatch(/Jane|12345678|BIDG|116/);
  });

  it("shows only the format of schedule fields, and never of names or ids", () => {
    const body = {
      courseInformationHeader: { name: "Jane Doe", bannerId: "A12345678" },
      classList: [{ classStartTime: "0900", classEndTime: "9:50 AM", classBuilding: "Bidgood Hall", classRoomCode: "116", startEndMonth: 10, classCrn: "45678" }],
    };
    const shape = shapeOf(body);
    expect(shape.courseInformationHeader).toEqual({ name: "string", bannerId: "string" });
    expect(shape.classList[1]).toEqual({
      classStartTime: 'string like "9999"',
      classEndTime: 'string like "9:99 AA"',
      classBuilding: 'string like "Aaaaaaa Aaaa"',
      classRoomCode: 'string like "999"',
      startEndMonth: "number 10",
      classCrn: "string",
    });
    expect(JSON.stringify(shape)).not.toMatch(/Jane|A12345678|Bidgood|45678/);
  });

  it("lists query parameter names, never values", () => {
    expect(queryKeys("https://x.ua.edu/a?startDate=11%2F02%2F2026&termCode=202640")).toEqual(["startDate", "termCode"]);
    expect(queryKeys("nope")).toEqual([]);
  });
});
