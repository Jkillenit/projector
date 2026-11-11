import { parseSyllabus } from "../../syllabus/syllabusParser.js";
import { courseStore } from "../../db/courseStore.js";
import { meetingKey, readMeeting, shouldSaveSyllabusMeeting } from "../courses/courseMeeting.js";

const GRADING_HEADING =
  /(grad(e|ing)\s*(breakdown|distribution|policy|policies|weights?|components?|criteria|scale)|course\s+grade|evaluation|assessment\s+(weights?|breakdown)|how\s+you\s+will\s+be\s+graded)/gi;
const WINDOW_CHARS = 3000;

function weightTotal(grading) {
  return grading.reduce((sum, c) => sum + Number(c.weight || 0), 0);
}

function plausible(grading) {
  const total = weightTotal(grading);
  return grading.length >= 2 && total > 0.8 && total < 1.2;
}

/**
 * Parses grade weights from a full syllabus. Long documents (Simple Syllabus pages, PDFs) mention
 * percentages everywhere, so the text around grading headings is tried first.
 */
export function parseSyllabusGrading(text) {
  const source = String(text || "");
  const full = parseSyllabus(source);
  let best = plausible(full.grading) ? full : null;
  for (const match of source.matchAll(GRADING_HEADING)) {
    const windowText = source.slice(match.index, match.index + WINDOW_CHARS);
    const parsed = parseSyllabus(windowText);
    if (plausible(parsed.grading) && (!best || Math.abs(weightTotal(parsed.grading) - 1) < Math.abs(weightTotal(best.grading) - 1))) {
      best = { ...parsed, gradingScale: full.gradingScale };
    }
  }
  return best || full;
}

/** Saves where and when the class meets, unless the student already fixed it by hand. */
async function saveSyllabusMeeting(courseUuid, text) {
  const { meeting } = parseSyllabus(text);
  const existing = readMeeting(await courseStore.getSetting(meetingKey(courseUuid)));
  if (shouldSaveSyllabusMeeting(existing, meeting)) {
    await courseStore.setSetting(meetingKey(courseUuid), JSON.stringify({ ...meeting, source: "syllabus" }));
  }
}

/**
 * Turns a synced syllabus into grade components when the course has none yet, then sorts the
 * synced Blackboard grades into them. Existing components are never replaced automatically.
 * @returns {Promise<{ status: "applied"|"kept"|"none", count?: number, mapped?: number }>}
 */
export async function applySyllabusText(courseUuid, text) {
  const db = window.studyHub?.db;
  if (!db || !courseUuid || !text) return { status: "none" };
  await saveSyllabusMeeting(courseUuid, text).catch(() => {});
  const existing = await db.grades.getComponents(courseUuid);
  if (existing?.length) {
    const applied = await db.bb.applyGrades(courseUuid);
    return { status: "kept", count: existing.length, mapped: applied?.mapped ?? 0 };
  }
  const parsed = parseSyllabusGrading(text);
  if (parsed.grading.length < 2) return { status: "none" };
  await courseStore.saveGradeComponents(courseUuid, parsed.grading);
  if (parsed.gradingScale) await db.grades.saveGradingScale({ courseUuid, scale: parsed.gradingScale });
  const applied = await db.bb.applyGrades(courseUuid);
  return { status: "applied", count: parsed.grading.length, mapped: applied?.mapped ?? 0 };
}
