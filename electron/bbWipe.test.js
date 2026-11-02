import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { wipeBlackboardData } = require("./bbWipe.cjs");

// better-sqlite3 is built for either Node (npm rebuild better-sqlite3) or Electron (npm run rebuild), never both.
let Database = null;
try {
  Database = require("better-sqlite3");
  new Database(":memory:").close();
} catch {
  Database = null;
  console.warn("[skip] better-sqlite3 will not load under Node (it is probably built for Electron). Run: npm rebuild better-sqlite3");
}

function seed() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE courses (id INTEGER PRIMARY KEY, uuid TEXT, bb_course_id TEXT);
    CREATE TABLE assignments (id INTEGER PRIMARY KEY, course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE, source TEXT);
    CREATE TABLE announcements (id INTEGER PRIMARY KEY, course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE);
    CREATE TABLE bb_items (id INTEGER PRIMARY KEY);
    CREATE TABLE bb_grade_items (id INTEGER PRIMARY KEY);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO courses VALUES (1, 'linked', '_1_1'), (2, 'manual', NULL);
    INSERT INTO assignments VALUES (1, 1, 'blackboard'), (2, 2, 'manual'), (3, 2, 'blackboard');
    INSERT INTO announcements VALUES (1, 1), (2, 2);
    INSERT INTO bb_items VALUES (1);
    INSERT INTO bb_grade_items VALUES (1);
    INSERT INTO settings VALUES ('bb.syllabusLaunch', '{}'), ('blackboardUser', 'x'), ('grading_scale_linked', '{}'), ('theme', 'dark');
  `);
  return db;
}

describe.skipIf(!Database)("wipeBlackboardData", () => {
  it("removes linked courses, mirrored rows and Blackboard settings, and keeps everything else", () => {
    const db = seed();
    wipeBlackboardData(db);
    const count = (sql) => db.prepare(sql).get().n;
    expect(count("SELECT COUNT(*) n FROM courses")).toBe(1);
    expect(db.prepare("SELECT uuid FROM courses").get().uuid).toBe("manual");
    expect(count("SELECT COUNT(*) n FROM bb_items")).toBe(0);
    expect(count("SELECT COUNT(*) n FROM bb_grade_items")).toBe(0);
    expect(count("SELECT COUNT(*) n FROM assignments WHERE source = 'blackboard'")).toBe(0);
    expect(count("SELECT COUNT(*) n FROM assignments")).toBe(1);
    expect(count("SELECT COUNT(*) n FROM announcements")).toBe(1);
    expect(db.prepare("SELECT key FROM settings").all().map((r) => r.key)).toEqual(["theme"]);
  });
});
