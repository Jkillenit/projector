import students from "../demo/students.json";
import courses from "../demo/courses.json";
import enrollments from "../demo/enrollments.json";
import assignments from "../demo/assignments.json";
import announcements from "../demo/announcements.json";
import organizations from "../demo/organizations.json";
import demoCards from "../demo/flashcards.json";
import demoEvents from "../demo/events.json";
import services from "../../electron/connections/services.json";
import syllabusText from "../demo/syllabus.txt?raw";
import { localDayKey } from "../lib/dates.js";

export const DEMO_KEY = "fd.demo";
export const PROFILE_KEY = "fd.profile";
const DAY = 86400000;

const emptyState = () => ({ completed: {}, read: {}, settings: {}, targets: {}, scores: {}, scales: {}, components: {}, cards: {}, connections: {} });

/**
 * Builds the object that stands in for window.studyHub in a plain browser. Same method names and row
 * shapes as the Electron preload, backed by src/demo/*.json. Changes live in one localStorage key.
 * `now` is injectable so due dates (stored as days from today) are testable.
 */
export function buildDemoBridge({ storage = globalThis.localStorage, now = () => new Date() } = {}) {
  let state = emptyState();
  try {
    state = { ...state, ...(JSON.parse(storage.getItem(DEMO_KEY)) || {}) };
  } catch {
    /* start fresh */
  }
  const save = () => storage.setItem(DEMO_KEY, JSON.stringify(state));
  const iso = (offsetDays, hour = 12, minute = 0) => {
    const d = new Date(now());
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const ago = (days) => new Date(now().getTime() - days * DAY).toISOString();

  const profile = () => {
    try {
      return JSON.parse(state.settings[PROFILE_KEY]) || null;
    } catch {
      return null;
    }
  };
  const student = () => students.find((s) => s.id === profile()?.studentId) || null;
  const myCourses = () => {
    const ids = new Set(enrollments.filter((e) => e.student_id === student()?.id).map((e) => e.course_id));
    return courses.filter((c) => ids.has(c.id));
  };
  const courseById = (id) => courses.find((c) => c.id === id) || null;

  // Demo values the real app keeps in settings: Blackboard overall grade, dropped scores, organizations.
  const seeded = (key) => {
    const [, kind, id] = key.match(/^(bb.overall|grades.drops).(.+)$/) || [];
    const c = courseById(id);
    if (kind === "bb.overall") return c?.overall ? JSON.stringify(c.overall) : null;
    if (kind === "grades.drops") return c?.drops ? JSON.stringify(c.drops) : null;
    if (key === "bb.orgs") return JSON.stringify(courses.filter((x) => x.organization).map((x) => x.bb_course_id));
    return null;
  };
  const CONTENT = ["Syllabus", "Course schedule", "Lecture slides", "Study guide"];

  const componentsOf = (courseId) =>
    (state.components[courseId] || courseById(courseId)?.grade_components || []).map((c, position) => ({ ...c, position }));

  const asgRow = (a) => ({
    uuid: a.id,
    course_uuid: a.course_id,
    title: a.title,
    kind: a.kind,
    due_date: iso(a.due_in_days, a.due_hour, a.due_minute),
    completed: state.completed[a.id] ?? a.completed ? 1 : 0,
    submitted: 0,
    score: a.score,
    points_possible: a.points_possible,
    component_uuid: a.component_id,
    posted_at: a.posted_days_ago == null ? null : ago(a.posted_days_ago),
    url: null,
    source: "demo",
  });
  const rowsFor = (courseId) => assignments.filter((a) => a.course_id === courseId).map(asgRow);
  const withCourse = (row) => {
    const c = courseById(row.course_uuid);
    return { ...row, course_name: c?.name, course_code: c?.code, course_color: c?.color };
  };

  const componentScore = (courseId, comp) => {
    if (comp.id in state.scores) return state.scores[comp.id];
    const graded = rowsFor(courseId).filter((r) => r.component_uuid === comp.id && r.score != null);
    const possible = graded.reduce((s, r) => s + r.points_possible, 0);
    if (!possible) return null;
    return Math.round((graded.reduce((s, r) => s + r.score, 0) / possible) * 1000) / 10;
  };

  const componentRows = (courseId) =>
    componentsOf(courseId).map((c) => ({ id: c.id, uuid: c.id, name: c.name, category: c.category, position: c.position, weight: c.weight / 100, score: componentScore(courseId, c) }));

  const courseRow = (c) => ({
    uuid: c.id,
    name: c.name,
    color: c.color,
    subtitle: "",
    term: c.term,
    course_code: c.code,
    instructor: c.instructor,
    bb_course_id: c.bb_course_id,
    target_grade: state.targets[c.id] ?? c.target_grade,
    module_count: 0,
  });

  const todayData = (onlyCourse) => ({
    now: now().toISOString(),
    synced: true,
    syncedAt: now().toISOString(),
    courses: myCourses()
      .filter((c) => !onlyCourse || c.id === onlyCourse)
      .map((c) => {
        const rows = rowsFor(c.id);
        const since = now().getTime() - 30 * DAY;
        const open = rows.filter((r) => !r.completed && Date.parse(r.due_date) >= since).sort((a, b) => a.due_date.localeCompare(b.due_date));
        const finished = rows.filter((r) => r.completed && Date.parse(r.due_date) >= since);
        return {
          uuid: c.id,
          name: c.name,
          courseCode: c.code,
          bbCourseId: c.bb_course_id,
          targetGrade: state.targets[c.id] ?? c.target_grade,
          cardsTotal: 0,
          cardsDue: 0,
          components: componentRows(c.id).map((comp) => {
            const mapped = rows.filter((r) => r.component_uuid === comp.uuid);
            return { uuid: comp.uuid, name: comp.name, weight: comp.weight, category: comp.category, score: comp.score, pointsTotal: mapped.reduce((s, r) => s + r.points_possible, 0), itemCount: mapped.length };
          }),
          assignments: open.map((r) => ({ uuid: r.uuid, title: r.title, kind: r.kind, dueDate: r.due_date, score: r.score, pointsPossible: r.points_possible, url: null, source: "demo", componentUuid: r.component_uuid })),
          finished: finished.map((r) => ({ uuid: r.uuid, kind: r.kind })),
        };
      }),
  });

  const annRows = (courseId) =>
    announcements
      .filter((a) => a.course_id === courseId)
      .map((a) => ({ uuid: a.id, course_uuid: a.course_id, title: a.title, body: a.body, posted_at: ago(a.posted_days_ago), created_at: ago(a.posted_days_ago), read: state.read[a.id] ?? a.read ? 1 : 0 }))
      .sort((a, b) => b.posted_at.localeCompare(a.posted_at));

  const ok = async () => ({ success: true });
  const connectionList = () =>
    services.map(({ id, name, reads, sends, ready }) => ({ id, name, reads, sends, ready, connected: !!state.connections?.[id], connectedAt: state.connections?.[id]?.at || null }));

  // Cards per course, in the row shape db:courses:getFull returns. Seeded from src/demo/flashcards.json on first use.
  const cardsOf = (courseId) => {
    if (!state.cards[courseId]) {
      state.cards[courseId] = (demoCards[courseId] || []).map((c) => ({ uuid: c.id, front: c.front, back: c.back, source: "manual", module_uuid: null, created_at: ago(30) }));
    }
    return state.cards[courseId];
  };
  const findCard = (uuid) => courses.map((c) => cardsOf(c.id).find((card) => card.uuid === uuid)).find(Boolean) || null;

  return {
    platform: "web",
    mode: "demo",
    openExternal: async (url) => void globalThis.open?.(url, "_blank", "noopener"),
    /** A browser cannot read PDF or Word files, so the demo answers every upload with a sample syllabus. */
    extractFile: async () => ({ ok: true, text: syllabusText }),
    /** The made-up clubs. Live mode reads The SOURCE instead (electron/publicFeeds.cjs). */
    clubs: {
      list: async () => ({ ok: true, source: "demo", rows: organizations }),
    },
    /** Pretend connections: Connect flips the switch, no window and no network (rule 6). */
    connections: {
      list: async () => connectionList(),
      connect: async (id) => {
        if (!services.find((s) => s.id === id && s.ready)) return { ok: false, error: "This connection is not available yet." };
        state.connections[id] = { at: now().toISOString() };
        save();
        return { ok: true };
      },
      disconnect: async (id) => {
        delete state.connections[id];
        save();
        return { ok: true };
      },
      onChanged: () => () => {},
    },
    /** Made-up events, already in the shape src/features/campus/campusEvents.js builds. Dates are days from today. */
    events: {
      list: async () => ({
        ok: true,
        source: "demo",
        events: demoEvents.map((e) => ({
          id: e.id,
          title: e.title,
          start: iso(e.starts_in_days, e.hour, e.minute),
          end: iso(e.starts_in_days, e.hour + e.hours, e.minute),
          where: e.where,
          online: !!e.online,
          host: e.host,
          url: null,
          source: "demo",
          text: `${e.title} ${e.host} ${e.tags.join(" ")}`,
        })),
      }),
    },
    app: {
      info: async () => ({ version: "demo", demo: true }),
      /** Forgets every change, including the chosen student (kept in settings), so the next load starts from the welcome. */
      resetDemo: () => {
        state = emptyState();
        storage.removeItem(DEMO_KEY);
      },
    },
    db: {
      courses: {
        getAll: async () => myCourses().map(courseRow),
        get: async (uuid) => (courseById(uuid) ? courseRow(courseById(uuid)) : undefined),
        getFull: async (uuid) => (courseById(uuid) ? { course: courseRow(courseById(uuid)), modules: [], flashcards: cardsOf(uuid).map((c) => ({ ...c })), glossary: [] } : null),
        saveFull: ok,
        delete: ok,
      },
      notes: { save: ok },
      flashcards: {
        save: async ({ courseUuid, uuid, front, back } = {}) => {
          const f = String(front || "").trim();
          const b = String(back || "").trim();
          if (!courseById(courseUuid) || !uuid || !f || !b) return { success: false, error: "A card needs a front and a back." };
          const list = cardsOf(courseUuid);
          const card = list.find((c) => c.uuid === uuid);
          if (card) Object.assign(card, { front: f, back: b });
          else list.push({ uuid, front: f, back: b, source: "manual", module_uuid: null, created_at: now().toISOString() });
          save();
          return { success: true };
        },
        delete: async (uuid) => {
          for (const c of courses) state.cards[c.id] = cardsOf(c.id).filter((card) => card.uuid !== uuid);
          save();
          return { success: true };
        },
      },
      mastery: {
        update: async ({ flashcardUuid, grade, easeFactor, intervalDays, repetitions, nextReview } = {}) => {
          const card = findCard(flashcardUuid);
          if (!card) return { success: false, error: "Flashcard not found" };
          Object.assign(card, { ease_factor: easeFactor, interval_days: intervalDays, repetitions, next_review: nextReview, last_review: localDayKey(now()), last_grade: grade });
          save();
          return { success: true };
        },
      },
      settings: {
        get: async (key) => state.settings[key] ?? seeded(key),
        set: async ({ key, value }) => {
          state.settings[key] = value;
          save();
          return { success: true };
        },
      },
      grades: {
        getComponents: async (courseUuid) => componentRows(courseUuid),
        saveComponents: async ({ courseUuid, components }) => {
          state.components[courseUuid] = components.map((c) => ({ id: c.uuid || c.id, name: c.name, weight: Number(c.weight) * 100, category: c.category }));
          save();
          return { success: true };
        },
        upsertEntry: async ({ componentId, score }) => {
          state.scores[componentId] = score;
          save();
          return { success: true };
        },
        getSubEntries: async () => [],
        saveSubEntry: ok,
        deleteSubEntry: ok,
        saveGradingScale: async ({ courseUuid, scale }) => {
          state.scales[courseUuid] = scale;
          save();
          return { success: true };
        },
        getGradingScale: async (courseUuid) => state.scales[courseUuid] ?? null,
      },
      assignments: {
        getByCourse: async (courseUuid) => rowsFor(courseUuid).sort((a, b) => a.due_date.localeCompare(b.due_date)),
        getRange: async ({ from, to }) =>
          myCourses()
            .flatMap((c) => rowsFor(c.id))
            .filter((r) => r.due_date >= from && r.due_date < to)
            .map(withCourse),
        save: ok,
        delete: ok,
        setCompleted: async ({ uuid, completed }) => {
          const before = assignments.find((a) => a.id === uuid);
          const was = state.completed[uuid] ?? before?.completed ?? false;
          state.completed[uuid] = !!completed;
          save();
          return { success: true, changed: was !== !!completed };
        },
      },
      announcements: {
        getByCourse: async (courseUuid) => annRows(courseUuid),
        markRead: async (uuid) => {
          state.read[uuid] = true;
          save();
          return { success: true };
        },
      },
      bb: {
        getItems: async (courseUuid) => CONTENT.map((title, i) => ({ bb_id: `${courseUuid}-c${i}`, parent_bb_id: null, title, kind: i === 0 ? "file" : "folder", url: null, position: i })),
        getGradeItems: async (courseUuid) =>
          rowsFor(courseUuid)
            .filter((r) => r.score != null)
            .map((r) => ({ bb_id: r.uuid, name: r.title, score: r.score, points_possible: r.points_possible, graded_at: r.posted_at, synced_at: r.posted_at, component_uuid: r.component_uuid, componentUuid: r.component_uuid, auto: false, excluded: false })),
        setItemComponent: ok,
        applyGrades: async () => ({ filled: 0, mapped: 0 }),
      },
      dashboard: {
        get: async () => {
          const mine = myCourses();
          const rows = mine.flatMap((c) => rowsFor(c.id));
          const horizon = now().getTime() + 14 * DAY;
          return {
            upcoming: rows.filter((r) => !r.completed && Date.parse(r.due_date) >= now().getTime() - DAY && Date.parse(r.due_date) < horizon).map(withCourse),
            announcements: mine.flatMap((c) => annRows(c.id)).slice(0, 8),
            dueCards: [],
            recentGrades: rows.filter((r) => r.score != null).sort((a, b) => b.posted_at.localeCompare(a.posted_at)).slice(0, 6).map((r) => ({ name: r.title, score: r.score, points_possible: r.points_possible, graded_at: r.posted_at, course_uuid: r.course_uuid, course_name: courseById(r.course_uuid)?.name, course_code: courseById(r.course_uuid)?.code })),
            stats: {},
          };
        },
      },
      today: {
        get: async (args) => todayData(args?.courseUuid),
        setTargetGrade: async ({ courseUuid, targetGrade }) => {
          state.targets[courseUuid] = Number(targetGrade);
          save();
          return { success: true };
        },
      },
    },
  };
}

/** Installs the bridge only when there is no real one (the Electron preload sets window.studyHub first). */
export function installDemoBridge() {
  if (globalThis.window?.studyHub) return false;
  window.studyHub = buildDemoBridge();
  return true;
}
